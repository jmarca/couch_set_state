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

function testing (t){
    return t.test('churn out lots of sets', (tt) =>{
        //tt.plan(25)
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
                        tt.pass('should not have conflicts')
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
