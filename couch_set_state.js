const superagent = require('superagent')
const config={'couchdb':{}}
const config_okay = require('config_okay')
const CONFLICT_ERROR='unresolvable conflict'
const CONFLICT_STATUS=409
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


function get_state(year,state,doc){
    if(year===undefined){
        return doc[state]
    }else{
        if(doc[year] !== undefined ){
            return doc[year][state]
        }else{
            return doc[year]
        }
    }
}

const year_test = (year,state,old_doc,conflict_err) => {
    const old_state = get_state(year,state,old_doc)
    // console.log(old_doc,old_state)
    if(old_state === undefined ){
        // console.log('old state is undefined')
        return (new_doc) => {
            // this version is empty old doc, so if the new doc has
            // the same state set as the target, then fail (we started
            // empty, something else set our state)
            let new_state = get_state(year,state,new_doc)
            // console.log('new_state is ',new_state)
            return new_state === undefined
        }
    }else{
        // console.log('old state is defined as ',old_state)
        return (new_doc)=>{
            let new_state = get_state(year,state,new_doc)
            return new_state === old_state
        }
    }

}



function make_conflict_handler(desired_state,getter,putter){
    let looplimit = 10
    let update_safe
    const year = desired_state.year
    const state = desired_state.state
    const value = desired_state.value
    let old_doc = {}
    let conflict_err
    const conflict_handler = err => {
        conflict_err = err
        // compare old doc with the new doc in results
        // focusing on the key we're trying to update in desired_state
        return getter()
            .then( doc =>{
                if(! update_safe ){
                    old_doc = set_old_doc(year,state,doc)
                    update_safe = year_test(desired_state.year,desired_state.state,old_doc,conflict_err)
                }else{
                    if(!update_safe(doc)){
                        //console.log('not safe to update')
                        throw conflict_err
                    }
                }
                // if still here, didn't throw
                // if didn't throw, either first pass, or update safe
                // console.log('safe to update')
                return putter(doc)
                    .catch( err=> {
                        if(looplimit-- > 0 &&
                           err.status !== undefined &&
                           err.status === 409) {
                            return conflict_handler(err)
                        }else{
                            throw err
                        }
                    })
            })
    }
    return conflict_handler
}

function get_handler(res){
    return res.body
}


function make_year_modifier (year,state,value){
    return (doc)=>{
        if(doc[year] === undefined){
            doc[year]={}
        }
        doc[year][state]=value
        return doc
    }
}

function make_state_modifier (state,value){
    return (doc)=>{
        doc[state]=value
        return doc
    }
}

// make handler to modify and put the doc
function make_modifier(desired_state){
        // modify doc to contain new state value
    if(desired_state.year){
        return make_year_modifier(desired_state.year
                                  ,desired_state.state
                                  ,desired_state.value)
    }else{
        return make_state_modifier(desired_state.state
                                  ,desired_state.value)
    }
}

function set_old_doc(year,state,doc){
    let old_doc = {}
    if(year === undefined){
        old_doc[state] = doc[state]
    }else{
        old_doc[year] = {}
        if(doc[year] !== undefined &&
           doc[year][state] !== undefined){
            old_doc[year][state] = doc[year][state]
        }
    }
    return old_doc
}


function make_putter (query,desired_state){
    const _query = query
    const modify_doc = make_modifier( desired_state)

    return (doc) => {

        return superagent
            .put(_query)
            .type('json')
            .set('accept','application/json')
            .send(modify_doc(doc))
    }
}

function make_getter (query){
    const _query = query
    return  ()=>{
        return superagent
            .get(_query)
            .set('accept','application/json')
            .set('followRedirect',true)
            .then(get_handler)
            .catch( err =>{
                // console.log(err.response.body)
                if(err.status !== undefined &&
                   err.status === 404 &&
                   err.response.body !== undefined &&
                   err.response.body.reason === 'missing'
                  ){ // not found, but just missing.  fine
                    let doc  = {}
                    return doc
                }else{
                    throw err
                }
            })
    }
}



// need to simplify this code.

/*eslint complexity: ["error", 9]*/
function _couchdb_set_state(opts,cb){
    if(opts.couchdb !== undefined){
        throw new Error('hey, you are using an old way of doing this')
    }
    const c = Object.assign({},config.couchdb,opts)
    const db = c.db
    const id = c.doc
    const desired_state = {'year':c.year
                           ,'state':c.state
                           ,'value':c.value}
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

    const put_job = make_putter(query,desired_state)
    const get_job = make_getter(query)
    // now set up the recursive get/put/retry chain of commands
    const conflict_handler =
          make_conflict_handler(
              desired_state
              ,get_job
              ,put_job
          )

    const req = conflict_handler()
    if(!cb || cb === undefined){
        return req //return the promise object
    }else{
        // wait for the promise object to finish
        req
            .then( res =>{
                if(res.error){
                    // console.log(res.text)
                    // throw new Error('error saving state')
                    return cb(res.error)
                }
                return cb(null,res)
            })
            .catch( err => {
                // console.log('in the final catch in set state')
                return cb(err)
            })
        return null
    }
}

module.exports=couchdb_set_state
