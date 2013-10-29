var superagent = require('superagent')
var server = process.env.COUCHDB_HOST || 'localhost'
var port = process.env.COUCHDB_PORT || 5984
var couchdb = 'http://'+server+':'+port

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
function couchdb_set_state(opts,cb){
    var db = opts.db
    var id = opts.doc
    var year = opts.year
    var state = opts.state
    var value = opts.value
    var cdb = opts.couchdb || server
    var cport = opts.port || port
    cdb = 'http://'+server+':'+cport
    var query = cdb+'/'+db+'/'+id
    superagent
    .get(query)
    .set('accept','application/json')
    .set('followRedirect',true)
    .end(function(err,res){
        if(err) return cb(err)
        if(res.err){
            return cb(res.err)
        }
        var doc = res.body
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
