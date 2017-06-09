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
    t.plan(1)

    return t.test(
        'should use config file'
        ,function(tt){
            tt.plan(3)
            setter({'doc':'doc1'
                    ,'year':2008
                    ,'state':'vdsraw_chain_lengths'
                    ,'value':[11,23,19,22,15]
                    ,config_file:config_file}
                   ,function(err,state){
                       if(err){
                           throw new Error(err)
                       }
                       tt.notOk(err,'should not get setter err')
                       getter({'db':config.couchdb.db
                               ,'doc':'doc1'
                               ,'year':2008
                               ,'state':'vdsraw_chain_lengths'
                               ,'host':config.couchdb.host
                               ,'port':config.couchdb.port}
                              ,function(err,state){
                                  tt.notOk(err,'should not get getter err')
                                  tt.same(state,[11,23,19,22,15])
                                  tt.end()
                                  return null
                              })
                       return null
                   })
            return null
        }).catch(function(e){
            throw e
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
    .then(function(){
        tap.end()
        return utils.teardown(config)
    })
    .catch(function(e){
        throw e
    })
