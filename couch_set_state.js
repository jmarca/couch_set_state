var superagent = require('superagent')
var config={'couchdb':{}}
var config_okay = require('config_okay')
var _ = require('lodash')

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
        return config_okay(opts.config_file,function(e,c){
            config.couchdb = c.couchdb
            return _couchdb_set_state(opts,cb)
        })
    }

    // otherwise, hopefully everything is defined in the opts file!
    return _couchdb_set_state(opts,cb)
}


function _couchdb_set_state(opts,cb){
    var c = {}
    _.assign(c,config.couchdb,opts)
    var db = c.db
    var id = c.doc
    var year = c.year
    var state = c.state
    var value = c.value
    if(opts.couchdb !== undefined){
        throw new Error('hey, you are using an old way of doing this')
    }
    var cdb = c.host || '127.0.0.1'
    var cport = c.port || 5984
    cdb = cdb+':'+cport
    if(! /http/.test(cdb)){
        cdb = 'http://'+cdb
    }

    var query = cdb+'/'+db+'/'+id
    superagent
    .get(query)
    .set('accept','application/json')
    .set('followRedirect',true)
    .end(function(err,res){
        if(err) return cb(err)
        var doc = res.body
        if(res.body.error && res.body.error=='not_found'
          && res.body.reason && res.body.reason=='missing'){
            //need to make a new doc
            doc = {}
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
        superagent
        .put(query)
        .type('json')
        .send(doc)
        .end(function(err,putres){
            if(err) return cb(err)
            if(putres.error){
                console.log(putres.text)
                return cb('error saving state')
            }
            return cb()
        })
        return null
    })
}
module.exports=couchdb_set_state
