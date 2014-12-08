/* global require console process describe it */

var should = require('should')
var setter = require('../couch_set_state')

var getter = require('couch_check_state')

var _ = require('lodash')
var superagent = require('superagent')

var path    = require('path')
var rootdir = path.normalize(__dirname)
var config_okay = require('config_okay')
var config_file = rootdir+'/../test.config.json'

var queue = require('queue-async')

var date = new Date()
var inprocess_string = date.toISOString()+' inprocess'

var cdb
var docs = []
function populate_db(config,cb){

var mydocs = {'docs':[{'_id':'doc1'
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

    superagent.post(cdb+'/_bulk_docs')
    .type('json')
    .send(mydocs)
    .end(function(e,r){
        if(e) cb(e)
        _.each(r.body
              ,function(resp){
                   resp.should.have.property('ok')
                   docs.push({doc:{_id:resp.id
                                  ,_rev:resp.rev}})
               });
        return cb()
    })
    return null
}

function create_tempdb(config,cb){
    var date = new Date()
    var test_db_unique = [date.getHours(),
                          date.getMinutes(),
                          date.getSeconds(),
                          date.getMilliseconds()].join('-')
    config.couchdb.db += test_db_unique
    cdb ='http://'+
        [config.couchdb.host+':'+config.couchdb.port
        ,config.couchdb.db].join('/')
    superagent
    .put(cdb)
    .auth(config.couchdb.auth.username,
          config.couchdb.auth.password
         )
    .end(function(e,r){
        should.not.exist(e)
        return cb()
    })
    return null
}
var config={}


describe('set vds id states',function(){
    //var created_locally=false
    before(function(done){
        config_okay(config_file,function(err,c){
            should.not.exist(err)
            config.couchdb = c.couchdb
            queue(1)
            .defer(create_tempdb,config)
            .defer(populate_db,config)
            .await(done)
        })

    })
    after(function(done){
        var opts = {'uri':cdb
                   ,'method': "DELETE"
                   ,'headers': {}
                   };
        superagent.del(cdb)
        .type('json')
        .auth(config.couchdb.auth.username,
              config.couchdb.auth.password
             )
        .end(function(e,r){
            if(e) return done(e)
            return done()
        })
        return null
    })

    it('should set chain lengths state for doc1, 2007'
      ,function(done){
           var task = _.assign({}
                              ,config.couchdb
                              ,{'doc':'801245'
                               ,'year':2008
                               ,'state':'truckimputed'
                               ,'value':inprocess_string
                               })

           setter(task
                 ,function(err,state){
                      should.not.exist(err)
                      delete task.value
                      getter(task
                            ,function(err,state){
                                 should.not.exist(err)
                                 state.should.eql(inprocess_string)
                                 return done()
                             })
                  })
       });
    it('should set inprocess string'
      ,function(done){
           var task = _.assign({}
                              ,config.couchdb
                              ,{'doc':'doc1'
                               ,'year':2008
                               ,'state':'vdsraw_chain_lengths'
                               ,'value':[11,23,19,22,15]})
           setter(task
                 ,function(err,state){
                      should.not.exist(err)
                      delete task.value
                      getter(task
                            ,function(err,state){
                                 should.not.exist(err)
                                 state.should.have.property('length',5)
                                 state.should.eql([11,23,19,22,15])
                                 return done()
                             })
                  })
       });

    it('should remove entirely if variable is defined but null'
      ,function(done){
           // now you see it
           var task = _.assign({}
                              ,config.couchdb
                              ,{'doc':'doc1'
                               ,'year':2008
                               ,'state':'vdsraw_chain_lengths'
                               ,'value':[1111,23,19,22,15]})
           setter(task
                 ,function(err,state){
                      should.not.exist(err)
                      delete task.value
                      getter(task
                            ,function(err,state){
                                 should.not.exist(err)
                                 state.should.have.property('length',5)
                                 state.should.eql([1111,23,19,22,15])
                                 // now you don't
                                 task.value = null
                                 setter(task
                                       ,function(err,state){
                                            should.not.exist(err)
                                            delete task.value
                                            getter(task
                                                  ,function(err,state){
                                                       should.not.exist(err)
                                                       should.not.exist(state)
                                                       return done()
                                                   })
                                        })

                             })
                  })

       });
    it('should create a clean, new document if needed'
      ,function(done){
           var task = _.assign({}
                              ,config.couchdb
                              ,{'doc':'doc1'
                               ,'year':2008
                               ,'state':'look_at_the_birdie'})

   getter(task
         ,function(err,state){
              should.not.exist(err)
              should.not.exist(state)
              // now set that value
              task.value='poof'
              setter(task
                    ,function(err){
                         should.not.exist(err)
                         delete task.value
                         getter(task
                               ,function(err,state){
                                    should.not.exist(err)
                                    should.exist(state)
                                    state.should.eql('poof')
                                    return done()
                                })
                     })

          })
       })
})
