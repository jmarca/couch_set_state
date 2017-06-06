/* global require console process describe it */

const tap = require('tap')

const setter = require('../couch_set_state')
const getter = require('couch_check_state')

const superagent = require('superagent')

const path    = require('path')
const rootdir = path.normalize(__dirname)
const config_okay = require('config_okay')
const config_file = rootdir+'/../test.config.json'
const config={}

tap.plan(1)


const date = new Date()
const inprocess_string = date.toISOString()+' inprocess'

let cdb
const docs = []

function populate_db(config,cb){

    const mydocs = {'docs':[{'_id':'doc1'
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
            if(e) {
                throw new Error(e)
            }
            console.log(r.body)
            //r.body.should.have.property('ok')
            docs.push ({doc:{ '_id':r.body.id
                              ,'_rev':r.body.rev}})
            return cb()
        })
    return null
}

function create_tempdb(config,cb){
    const date = new Date()
    const test_db_unique = [date.getHours(),
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
            //should.not.exist(e)
            return cb()
        })
    return null
}


function testing (t){
    t.plan(4)
    return t.test(
        'should set chain lengths state for doc1, 2007'
        ,function(tt){
          var task = Object.assign({}
                                   ,config.couchdb
                                   ,{'doc':'801245'
                                     ,'year':2008
                                     ,'state':'truckimputed'
                                     ,'value':inprocess_string
                                    })

          setter(task
                 ,function(err,state){
                     tt.notOk(err,'should not get an error')
                     delete task.value
                     getter(task
                            ,function(errr,state){
                                tt.notOk(errr,'should not get an error')
                                tt.is(state,inprocess_string)
                                tt.end()
                                return null
                            })
                     return null
                  })
      }).then(function(t){
          return t.test(
              'should set inprocess string'
              ,function(tt){
                  var task = Object.assign({}
                                           ,config.couchdb
                                           ,{'doc':'doc1'
                                             ,'year':2008
                                             ,'state':'vdsraw_chain_lengths'
                                             ,'value':[11,23,19,22,15]})
                  setter(task
                         ,function(err,state){
                             tt.notOk(err,'should not get an error from setter')
                             delete task.value
                             getter(task
                                    ,function(err,state){
                                        tt.notOk(err,'should not get error')
                                        tt.ok(state.length)
                                        tt.is(state.length,5,'length of 5')
                                        tt.same(state,[11,23,19,22,15])
                                        tt.end()
                                        return null
                                    })
                             return null
                         })
                  return null
              })
      }).then(function(t){
          return t.test(
              'should remove entirely if variable is defined but null'
              ,function(tt){
                  // now you see it
                  var task = Object.assign({}
                                           ,config.couchdb
                                           ,{'doc':'doc1'
                                             ,'year':2008
                                             ,'state':'vdsraw_chain_lengths'
                                             ,'value':[1111,23,19,22,15]})
                  setter(task
                         ,function(err,state){
                             tt.notOk(err,'should not get an error from setter')
                             delete task.value
                             getter(task
                                    ,function(err,state){
                                        tt.notOk(err,'should not get an error')
                                        tt.same(state,[1111,23,19,22,15])
                                        // now you don't
                                        task.value = null
                                        setter(task
                                               ,function(err,state){
                                                   tt.notOk(err,'should not get an error from setter')
                                                   delete task.value
                                                   getter(task
                                                          ,function(err,state){
                                                              tt.notOk(err,'should not get an error from setter')
                                                              tt.notOk(state,'should not have state')
                                                              tt.end()
                                                              return null
                                                          })
                                                   return null
                                               })
                                        return null
                                    })
                             return null
                         })
                  return null
              })
      }).then(function(t){
          return t.test(
              'should create a clean, new document if needed'
              ,function(tt){
                  var task = Object.assign({}
                                           ,config.couchdb
                                           ,{'doc':'doc1'
                                             ,'year':2008
                                             ,'state':'look_at_the_birdie'})

                  getter(task
                         ,function(err,state){
                             tt.notOk(err,'should not get error from get')
                             tt.notOk(state,'should.not.exist(state)')
                             // now set that value
                             task.value='poof'
                             setter(task
                                    ,function(err){
                                        tt.notOk(err,'should.not.exist(err)')
                                        delete task.value
                                        getter(task
                                               ,function(err,state){
                                                   tt.notOk(err,'should.not.exist(err)')
                                                   tt.ok(state,'should get state now')
                                                   tt.is(state,'poof')
                                                   tt.end()
                                                   return null
                                               })
                                        return null
                                    })
                             return null
                         })
                  return null
              })
      })
}

function teardown(config,done){
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
}

config_okay(config_file)
    .then(function(c){
        config.couchdb = c.couchdb
        create_tempdb(config,function(e,r){
            if(e)  throw e
            populate_db(config,function(ee,rr){
                if(e) throw ee
                return tap.test('test setting state',testing)
                    .then(function(tt){
                        teardown(config,function(eeee,rrrr){
                            tap.end()
                            return null
                        })
                        return null
                    })
                    .catch(function(e){
                        console.log('caught error',e)
                        throw(e)
                    })
            })
            return null
        })
        return null
    })
    .catch( function(e){
        throw e
    })
