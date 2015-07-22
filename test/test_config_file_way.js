/* global require console process describe it */

var should = require('should')
var setter = require('../couch_set_state')

var getter = require('couch_check_state')

var path    = require('path')
var rootdir = path.normalize(__dirname)
var config_file = rootdir+'/../test.config.json'

var config_okay = require('config_okay')
var config={}

var _ = require('lodash')
var superagent = require('superagent')



var inprocess_string = (new Date()).toISOString()+' inprocess'

var docs = {'docs':[{'_id':'doc1'
                    ,foo:'bar'}
                   ,{'_id':'doc2'
                    ,'baz':'bat'}

                   ,{"_id": "801245",
                     "2006": {
                     },
                     "2007": {
                         "vdsimputed": "todo",
                         "wim_neigbors_ready": {
                             "wim_id": 77,
                             "distance": 14788,
                             "direction": "east"
                         },
                         "wim_neigbors": {
                             "wim_id": 77,
                             "distance": 14788,
                             "direction": "east"
                         },
                         "truckimputed": "2013-04-06T04:45:11.832Z finish",
                         "paired_wim": null,
                         "vdsdata": "0",
                         "rawdata": "1",
                         "row": 1,
                         "vdsraw_chain_lengths": [2,2,2,2,2],
                         "vdsraw_max_iterations": 0,
                         "occupancy_averaged": 1,
                         "truckimputation_chain_lengths": [
                             145,
                             147,
                             144,
                             139,
                             143
                         ],
                         "truckimputation_max_iterations": 0
                     },
                     "2008": {
                         "vdsimputed": "todo",
                         "wim_neigbors_ready": {
                             "wim_id": 77,
                             "distance": 14788,
                             "direction": "east"
                         },
                         "wim_neigbors": {
                             "wim_id": 77,
                             "distance": 14788,
                             "direction": "east"
                         },
                         "vdsdata": "0",
                         "rawdata": "1",
                         "row": 1,
                         "truckimputed": "2012-05-21 inprocess",
                         "vdsraw_chain_lengths": [2,2,2,2,2],
                         "vdsraw_max_iterations": 0
                     }}

                   ]}
function create_tempdb(cb){
    var date = new Date()
    var test_db_unique = [config.couchdb.db,
                          date.getHours(),
                          date.getMinutes(),
                          date.getSeconds(),
                          date.getMilliseconds()].join('-')
    config.couchdb.db = test_db_unique
    var cdb =
        [config.couchdb.host+':'+config.couchdb.port
        ,config.couchdb.db].join('/')

    superagent.put(cdb)
    .type('json')
    .auth(config.couchdb.auth.username
         ,config.couchdb.auth.password)
    .end(function(err,result){
        if(result.error){
            // do not delete if we didn't create
            config.delete_db=false
        }else{
            config.delete_db=true
        }
        cb()
    })
    return null
}

describe('set vds id states',function(){
    before(function(done){
        config_okay(config_file,function(err,c){
            if(!c.couchdb.db){ throw new Error('need valid db defined in test.config.json')}
            config = c
            create_tempdb(done)
            return null
        })
        return null
    })
    after(function(done){
        var cdb =
            config.couchdb.host+':'+config.couchdb.port
                 + '/'+ config.couchdb.db
        if(config.delete_db){
            superagent.del(cdb)
            .type('json')
            .auth(config.couchdb.auth.username
                 ,config.couchdb.auth.password)
            .end(function(e,r){
                return done()
            })
            return null
        }else{
            console.log("not deleting what I didn't create:" + cdb)
            return done()
        }
    })
    it('should use config file'
      ,function(done){
           setter({'doc':'doc1'
                  ,'year':2008
                  ,'state':'vdsraw_chain_lengths'
                  ,'value':[11,23,19,22,15]
                  ,config_file:config_file}
                 ,function(err,state){
                      should.not.exist(err)
                      getter({'db':config.couchdb.db
                             ,'doc':'doc1'
                             ,'year':2008
                             ,'state':'vdsraw_chain_lengths'
                             ,'host':config.couchdb.host
                             ,'port':config.couchdb.port}
                            ,function(err,state){
                                 should.not.exist(err)
                                 state.should.have.property('length',5)
                                 state.should.eql([11,23,19,22,15])
                                 return done()
                             })
                  })
       });
})
