/* global require console process describe it */

const tap = require('tap')

const setter = require('../couch_set_state')
const getter = require('couch_check_state')

const path    = require('path')
const rootdir = path.normalize(__dirname)
const config_file = rootdir+'/../test.config.json'

const config_okay = require('config_okay')
const config={}

const superagent = require('superagent')

const inprocess_string = (new Date()).toISOString()+' inprocess'

const utils = require('./utils.js')


function testing (t){
    t.plan(3)
    return t.test('should not work right without config params',tt => {
        tt.plan(3)
        setter({'doc':'801245'
                ,'year':2008
                ,'state':'truckimputed'
                ,'value':inprocess_string
               }
               ,function(err,state){
                   tt.ok(err,'should fail without params')
                   tt.notOk(state)
                   console.log(err)
                   tt.ok(/db is required/.test(err),'failed without db')
                   tt.end()
               })
        return null
    })
        .then( () => {
            return t.test('no doc, no success',tt=>{
                tt.plan(3)
                setter({'db':'blemba'
                        ,'year':2008
                        ,'state':'truckimputed'
                        ,'value':inprocess_string
                       }
                       ,function(err,state){
                           tt.ok(err,'should fail without params')
                           tt.notOk(state)
                           console.log(err)
                           tt.ok(/document id is required/.test(err),'failed without doc')
                           tt.end()
                       })
                return null
            })
        })
        .then( () => {
            return t.test('fake db will not work', tt =>{
                tt.plan(3)
                setter({'doc':'801245'
                        ,'db':'plemba' // which doesn't exist
                        ,'year':2008
                        ,'state':'truckimputed'
                        ,'value':inprocess_string
                       }
                       ,function(err,state){
                           tt.ok(err,'should fail without params')
                           tt.notOk(state)
                           tt.match(err
                                    ,new Error('ECONNREFUSED')
                                   ,'failed without db')
                           tt.end()
                       })
                return null
            })
        })
        .catch(function(e){
            console.log('test catch.  hmm')
            throw e
        })
}
    // it('should obey couchdb and port parameters'
    //   ,function(done){
    //        setter({'db':config.couchdb.db
    //               ,'doc':'doc1'
    //               ,'year':2008
    //               ,'state':'vdsraw_chain_lengths'
    //               ,'value':[11,23,19,22,15]
    //                ,'host':config.couchdb.host
    //               ,'port':config.couchdb.port}
    //              ,function(err,state){
    //                   should.not.exist(err)
    //                   getter({'db':config.couchdb.db
    //                          ,'doc':'doc1'
    //                          ,'year':2008
    //                          ,'state':'vdsraw_chain_lengths'
    //                          ,'couchdb':config.couchdb.host
    //                          ,'port':config.couchdb.port}
    //                         ,function(err,state){
    //                              should.not.exist(err)
    //                              state.should.have.property('length',5)
    //                              state.should.eql([11,23,19,22,15])
    //                              return done()
    //                          })
    //               })
    //    });
    // it('should use config file'
    //   ,function(done){
    //        setter({'doc':'doc1'
    //               ,'year':2008
    //               ,'state':'vdsraw_chain_lengths'
    //               ,'value':[11,23,19,22,15]
    //               ,config_file:config_file}
    //              ,function(err,state){
    //                   should.not.exist(err)
    //                   getter({'db':config.couchdb.db
    //                          ,'doc':'doc1'
    //                          ,'year':2008
    //                          ,'state':'vdsraw_chain_lengths'
    //                          ,'couchdb':config.couchdb.host
    //                          ,'port':config.couchdb.port}
    //                         ,function(err,state){
    //                              should.not.exist(err)
    //                              state.should.have.property('length',5)
    //                              state.should.eql([11,23,19,22,15])
    //                              return done()
    //                          })
    //               })
    //    });

config_okay(config_file)
    .then(function(c){
        if(!c.couchdb.db){ throw new Error('need valid db defined in test.config.json')}
        config.couchdb = c.couchdb
        return utils.create_tempdb(config)
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
