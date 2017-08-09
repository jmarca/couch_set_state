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



function testing (t){
    return t.test('churn out lots of sets', (tt) =>{
        //tt.plan(25)
        const docids = [1
                        ,2
                        //,3
                        // ,4,5,6
                        // ,7,8,9
                       ].map( d => { return 'superspecial_'+d })
        const years = [
            1
            ,1
            //,3,4,5,6
            //,7,8,9
            //,10,11
        ].map( y =>{return 2010 + y} )
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
                let passed_job = {}
                const yearly_job = setter(newtask)
                    .then( results =>{
                        // expect results is okay across all docs
                        tt.is(results.status,201)
                        tt.ok(results.body.ok)
                        tt.ok(results.body.id)
                        tt.ok(results.body.rev)
                        if(passed_job[results.body.id] === undefined){
                            passed_job[results.body.id] = 1
                        }else{
                            passed_job[results.body.id]++
                        }
                        tt.is(passed_job[results.body.id],1) // only one job passes
                        return results.body
                    })
                    .catch(e =>{
                        //console.log(e)
                        tt.is(e.status,409)
                        tt.ok(e.response)
                        tt.ok(e.response.body)
                        tt.is(e.response.body.reason,'Document update conflict.')
                        tt.pass('should have conflicts')
                        return Object.assign({'id':newtask.doc},e.response.body)

                    })
                jobs.push(yearly_job)
                return null
            })
            return null
        })
        return Promise.all(jobs)
            .then( results =>{
                // console.log(results)
                // expect two pass, two conflict
                let passes = 0
                let failures = 0
                results.map( result =>{
                    if(result.rev !== undefined &&
                       result.ok ){
                        passes++
                    }
                    if(result.error === 'conflict' &&
                       result.reason === 'Document update conflict.'){
                        failures++
                    }
                    return null
                })
                tt.equal(passes,2,'got two successful state set cases')
                tt.equal(failures,2,'got two failed state set cases')
                tt.pass('no longer bailing out because that is horrible.')
                // all done with this test
            })
            .catch(e=>{
                tt.is(e.status,409)
                tt.ok(e.response)
                tt.ok(e.response.body)
                tt.is(e.response.body.reason,'Document update conflict.')
                tt.pass('did crashed with a document conflict')
                //tt.end()
            })
    }).then( async (t) => {
        const newtask = Object.assign(
            { 'doc': 'superspecial_1'
              ,'state': 'Cuba'
              ,'value':'Carcinogenic'
            }
            ,config.couchdb)

        // save that away
        const job = await setter(newtask)
        return t
    }).then( t => {
        return t.test('test resolvable conflicts', (tt) =>{
            //tt.plan(25)
            const docids = [1
                            ,2
                            ,3
                            // ,4,5,6
                            // ,7,8,9
                           ].map( d => { return 'superspecial_'+d })
            const states = ['Nicaragua','Cuba','Venezuela']
            const jobs = []
            let passed_job = {}
            docids.forEach( id =>{
                states.forEach ( state => {
                    const newtask = Object.assign(
                        { 'doc': id
                          ,'state':state
                          ,'value':'tropical'
                        }
                        ,config.couchdb)

                    // save that away
                    const job = setter(newtask)
                          .then( results =>{
                              // expect results is okay across all docs
                              tt.is(results.status,201)
                              tt.ok(results.body.ok)
                              tt.ok(results.body.id)
                              tt.ok(results.body.rev)
                              if(passed_job[results.body.id] === undefined){
                                  passed_job[results.body.id] = 1
                              }else{
                                  passed_job[results.body.id]++
                              }
                              return results.body
                          })
                          .catch(e =>{
                              //console.log(e)
                              tt.is(e.status,409)
                              tt.ok(e.response)
                              tt.ok(e.response.body)
                              tt.is(e.response.body.reason,'Document update conflict.')
                              tt.fail('should not have conflicts')
                              return Object.assign({'id':newtask.doc},e.response.body)

                          })
                jobs.push(job)
                return null
            })
            return null
        })
        return Promise.all(jobs)
            .then( results =>{
                // console.log(results)
                // expect all pass, no conflict
                docids.forEach( id => {
                    tt.is(passed_job[id],states.length,'got expected number of states set')
                    return null
                })

                let passes = 0
                let failures = 0
                results.map( result =>{
                    if(result.rev !== undefined &&
                       result.ok ){
                        passes++
                    }
                    if(result.error === 'conflict' &&
                       result.reason === 'Document update conflict.'){
                        failures++
                    }
                    return null
                })
                tt.equal(passes,docids.length * states.length,'got expected successful state set cases')
                tt.equal(failures,0,'got zero failed states')
                tt.pass('no longer bailing out because that is horrible.')
                // all done with this test
            })
            .catch(e=>{
                tt.is(e.status,409)
                tt.ok(e.response)
                tt.ok(e.response.body)
                tt.is(e.response.body.reason,'Document update conflict.')
                tt.fail('Oops.  should not have crashed with a document conflict')
                //tt.end()
            })

        })

    }).catch(tap.threw)

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
