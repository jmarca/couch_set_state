var superagent = require('superagent')
var config={'couchdb':{}}
var config_okay = require('config_okay')


/**
 * couchdb_set_state(opts,cb)
 * opts = {'db': the couchdb holding the document,
 *         'doc': the document holding the state,
 *         'year': the year to set (any sub key in the doc, really),
 *         'state': the state to get from the doc under the 'year' key,
 * }
 * cb = a callback
 *
 * cb will be called as cb(error,value)
 *
 * The error will contain any error passed from accessing couchdb
 *
 * The value can be null if there is nothing in the document, or will
 * equal the value of doc[year][state]
 *
 * in a special case, if there is doc[state], but nothing at doc[year]
 * and/or if opts.year is not defined, then I will return doc[state]
 *
 * So for example, if you want to set 'rawimpute' in the year 2008
 * for detector 1212432, in a couchdb called 'tracking', you would
 * call with
 *
 * {'db':'tracking',doc':'1212432','year':2008,'state':'rawimpute'}
 *
 * If you want to set 'rawimpute' in the year 2008 for detector
 * 1212432, in a couchdb database named vds_detector/tracking/D12, you
 * could call with
 *
 * {'db':'vds_detector%2ftracking%2f/D12','doc':'1212432',
 *  'year':2008,'state':'rawimpute'}
 *
 *
 *
 * note that I don't make any assumptions about the db or year, aside
 * from the fact that I expect that there will be a couchdb document
 * with that name.  Typically this means the detector id should
 * resolve to some string.  If you have a couchdb with slashes, you
 * should remember to escape those properly, etc
 *
 * If you pass dbroot, it is presumed that the separator is a slash,
 * and if you don't want that, then do not use dbroot, use a full
 * couchdb name passed as detector_id
 *
 */

// wrap call to config_okay, if needed
function couchdb_set_state(opts,cb){
    if(config.couchdb.host === undefined && opts.config_file !== undefined){
        return config_okay(opts.config_file)
            .then(function(c){
                config.couchdb = c.couchdb
                return _couchdb_set_state(opts,cb)
            })
    }

    // otherwise, hopefully everything is defined in the opts file!
    return _couchdb_set_state(opts,cb)
}


function _couchdb_set_state(opts,cb){
    const c = Object.assign({},config.couchdb,opts)
    const db = c.db
    const id = c.doc
    const year = c.year
    const state = c.state
    const value = c.value
    if(opts.couchdb !== undefined){
        throw new Error('hey, you are using an old way of doing this')
    }
    let cdb = c.host || '127.0.0.1'
    const cport = c.port || 5984
    cdb = cdb+':'+cport
    if(! /http/.test(cdb)){
        cdb = 'http://'+cdb
    }
    if(db === undefined ){
        return cb('db is required in options object under \'db\' key')
    }
    if(id === undefined ){
        return cb('document id is required in options object under \'doc\' key')
    }
    const query = cdb+'/'+db+'/'+id
    // console.log(query)
    return superagent
        .get(query)
        .set('accept','application/json')
        .set('followRedirect',true)
        .then( res=> {
            // console.log('back from query with res')
            let doc = {}
            if(res.body.error && res.body.error=='not_found'
               && res.body.reason && res.body.reason=='missing'){
                // need to make a new doc
                // doc = {}
            }else{
                doc = res.body
            }
            // modify doc to contain new state value
            if(year){
                if(doc[year] === undefined){
                    doc[year]={}
                }
                doc[year][state]=value
            }else{
                doc[state]=value
            }
            // save it
            return superagent
                .put(query)
                .type('json')
                .send(doc)
        },err =>{
            // console.log(err.response.body)
            if(err.status !== undefined &&
               err.status === 404 &&
               err.response.body !== undefined &&
               err.response.body.reason === 'missing'
              ){ // not found, but just missing
                    let doc  = {}
                // modify doc to contain new state value
                if(year){
                    if(doc[year] === undefined){
                        doc[year]={}
                    }
                    doc[year][state]=value
                }else{
                    doc[state]=value
                }
                // save it
                return superagent
                    .put(query)
                    .type('json')
                    .send(doc)
            }else{
                // not good, so bail out
                // console.log('in error else case, not 404 missing')
                throw err.response.body
            }
        })
        .then( res =>{
            if(res.error){
                // console.log(res.text)
                throw new Error('error saving state')
            }
            return cb(null,res)
        })
        .catch( err => {
            // console.log('in the final catch in set state')
            return cb(err)
        })
}

module.exports=couchdb_set_state
