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

const utils = require('./utils.js')

tap.plan(1)


const date = new Date()
const inprocess_string = date.toISOString()+' inprocess'

const docs = []

function populate_db(config){


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
    const cdb =
        [config.couchdb.host+':'+config.couchdb.port
        ,config.couchdb.db].join('/')

    return superagent.post(cdb+'/_bulk_docs')
        .type('json')
        .send(mydocs)

}


function testing (t){
    t.plan(7)
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
                                           ,{'doc':'doc5'
                                             ,'year':2008
                                             ,'state':'look_at_the_birdie'})

                  getter(task
                         ,function(err,state){
                             //console.log(err)
                             tt.ok(err,'should get error from get, doc is not there')
                             // now set that value
                             task.value='poof'
                             setter(task
                                    ,function(err){
                                        tt.notOk(err,'should.not.exist(err)---created doc')
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
      }).then(function(t){
          return t.test(
              'should not need year to be set'
              ,function(tt){
                  var task = Object.assign({}
                                           ,config.couchdb
                                           ,{'doc':'docnoyear'
                                             ,'state':'look_at_the_birdie'})

                  getter(task
                         ,function(err,state){
                             tt.ok(err,'should get error from get, doc is not there')
                             // now set that value
                             task.value='tweet'
                             setter(task
                                    ,function(err){
                                        tt.notOk(err,'should.not.exist(err)')
                                        delete task.value
                                        getter(task
                                               ,function(err,state){
                                                   tt.notOk(err,'should.not.exist(err)')
                                                   tt.ok(state,'should get state now')
                                                   tt.is(state,'tweet')
                                                   tt.end()
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
              'do not use callback, expect a promise'
              ,function(tt){
                  //tt.plan(3)
                  var task = Object.assign({}
                                           ,config.couchdb
                                           ,{'doc':'docnoyear'
                                             ,'year':'haveyear'
                                             ,'state':'look_at_the_birdie'})
                  // set that value
                  task.value='tweet'
                  const set_req =  setter(task)
                  set_req
                      .then( ()=>{
                          // value should be set, now check it
                          delete task.value
                          getter(task
                                 ,function(err,state){
                                     tt.notOk(err,'should.not.exist(err)')
                                     tt.ok(state,'should get state now')
                                     tt.is(state,'tweet')
                                     tt.end()
                                     return null
                                 })
                          return null
                      })
                      .catch( (e)=>{
                          tt.fail('should not error out')
                      })
              })

      }).then(function(t){
          return t.test(
              'can change setting without hitting a conflict error in promise case'
              ,function(tt){
                  var task = Object.assign({}
                                           ,config.couchdb
                                           ,{'doc':'docnoyear'
                                             ,'year':'haveyear'
                                             ,'state':'look_at_the_birdie'})
                  // set that value to something different now
                  task.value='fly away'
                  const set_req =  setter(task)

                  set_req
                      .then( ()=>{
                          // value should be set, now check it
                          tt.pass('did not throw')
                          tt.end()
                          return null
                      })
                      .catch( (e)=>{
                          tt.fail('should not error out')
                      })
              })

      })
}

config_okay(config_file)
    .then(function(c){
        if(!c.couchdb.db){ throw new Error('need valid db defined in test.config.json')}
        config.couchdb = c.couchdb
        return utils.create_tempdb(config)
    })
    .then(()=>{
        return populate_db(config)
    })
    .then( r => {
        docs.push ({doc:{ '_id':r.body.id
                          ,'_rev':r.body.rev}})
    })
    .then( function (){
        return tap.test('test setting state',testing)
    })
    .then(function(){
        tap.end()
        return utils.teardown(config)
    })
    .catch(function(e){
        throw e
    })
