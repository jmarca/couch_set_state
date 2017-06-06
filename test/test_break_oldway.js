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

tap.plan(1)

function create_tempdb(config,cb){
    const date = new Date()
    const test_db_unique = [config.couchdb.db,
                          date.getHours(),
                          date.getMinutes(),
                          date.getSeconds(),
                          date.getMilliseconds()].join('-')
    config.couchdb.db = test_db_unique
    const cdb =
        [config.couchdb.host+':'+config.couchdb.port
        ,config.couchdb.db].join('/')

    superagent.put(cdb)
    .type('json')
    .auth(config.couchdb.auth.username
         ,config.couchdb.auth.password)
    .end(function(err,result){
        cb()
    })
    return null
}

function testing (t){
    t.plan(1)

    return t.test(
        'should obey couchdb and port parameters'
        ,function(tt){
            tt.plan(3)
            setter({'db':config.couchdb.db
                    ,'doc':'doc1'
                    ,'year':2008
                    ,'state':'vdsraw_chain_lengths'
                    ,'value':[11,23,19,22,15]
                    ,'host':config.couchdb.host
                    ,'port':config.couchdb.port}

                   ,function(err,state){
                       tt.notOk(err,'not get error from set')
                       getter({'db':config.couchdb.db
                               ,'doc':'doc1'
                               ,'year':2008
                               ,'state':'vdsraw_chain_lengths'
                               ,'host':config.couchdb.host
                               ,'port':config.couchdb.port}
                              ,function(err,state){
                                  tt.notOk(err,'should not get err from getter')
                                  tt.same(state,[11,23,19,22,15])
                                  tt.end()
                                  return null
                              })
                       return null
                   })
            return null

        }).catch(function(e){
            console.log('testing error',e)
            throw e
        })
}

function teardown(config,done){
    const cdb =
          config.couchdb.host+':'+config.couchdb.port
          + '/'+ config.couchdb.db
    superagent.del(cdb)
        .type('json')
        .auth(config.couchdb.auth.username
              ,config.couchdb.auth.password)
        .end(function(e,r){
            return done()
        })
    return null
}


config_okay(config_file)
    .then(function(c){
        if(!c.couchdb.db){ throw new Error('need valid db defined in test.config.json')}
        config.couchdb = c.couchdb
        create_tempdb(config,function(e,r){
            if(e)  throw e
            return tap.test('test setting state',testing)
                .then(function(tt){
                    teardown(config,function(eeee,rrrr){
                        tap.end()
                        return null
                    })
                    return null
                })
                .catch(function(e){
                    throw(e)
                })
        })

        return null
    })
    .catch(function(e){
        throw e
    })
