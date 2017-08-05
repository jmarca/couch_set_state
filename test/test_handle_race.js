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


const docids = [1,2,3
               // ,4,5,6
               // ,7,8,9
               ].map( d => { return 'superspecial_'+d })
const years = [
    1
    ,2
    //,3,4,5,6
    //,7,8,9
    //,10,11
              ].map( y =>{return 2010 + y} )

function testing (t){
    t.plan(1)
    return t.test(
        'churn out lots of sets', (tt) =>{
            const jobs = []
            years.forEach( y =>{
                docids.forEach( id =>{
                    const newtask = Object.assign(
                        { 'doc': id
                          ,'year':y
                          ,'state':'mega'
                          ,'value':'unproductive'
                        }
                        ,config.couchdb)

                    // save that away
                    const yearly_job = setter(newtask)
                          .then( results =>{
                              // expect results is okay across all docs
                              tt.ok(results)
                              tt.ok(results.body)
                              tt.ok(results.body.ok)
                              tt.ok(results.body.id)
                              tt.ok(results.body.rev)
                              if(!results.body.ok){
                                  console.log(results.body)
                              }
                              return null
                          })
                          // .catch(e =>{
                          //     tt.is(e.status,409)
                          //     tt.ok(e.response)
                          //     tt.ok(e.response.body)
                          //     tt.is(e.response.body.reason,'Document update conflict.')
                          //     throw e
                          // })
                    jobs.push(yearly_job)
                    return null
                })
                return null
            })
            return  Promise.all(jobs)
                    .then( results =>{
                        tt.fail('should have crashed with a conflict.')
                        // all done with this test
                    })
                    .catch(e=>{
                        tt.is(e.status,409)
                        tt.ok(e.response)
                        tt.ok(e.response.body)
                        tt.is(e.response.body.reason,'Document update conflict.')
                        tt.end()
                        //console.log('going to throw now')
                        // throw(e)
                    })

        })
}

config_okay(config_file)
    .then(function(c){
        if(!c.couchdb.db){ throw new Error('need valid db defined in test.config.json')}
        config.couchdb = c.couchdb
        return utils.create_tempdb(config)
    })
    .then( function (){
        return tap.test('test setting state',testing)
    })
    .then( ()=>{
        tap.end()
        return utils.teardown(config)
    })
