/* global require console process describe it */

var env = process.env;
var cuser = env.COUCHDB_USER ;
var cpass = env.COUCHDB_PASS ;
var chost = env.COUCHDB_HOST || 'localhost';
var cport = env.COUCHDB_PORT || 5984;

// reset env vars so that the default use of environment variables fails
process.env.COUCHDB_HOST=''
process.env.COUCHDB_PORT='1234'
process.env.COUCHDB_USER=''
process.env.COUCHDB_PASS=''


var should = require('should')
var setter = require('../couch_set_state')

var getter = require('couch_check_state')

var _ = require('lodash')
var superagent = require('superagent')


var date = new Date()
var test_db ='test%2fbulk%2fdeleter_'+date.getMinutes()+date.getSeconds()
var couch = 'http://'+chost+':'+cport+'/'+test_db
date = new Date()
var inprocess_string = date.toISOString()+' inprocess'

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

describe('set vds id states',function(){
    before(function(done){
        // create a test db, the put data into it
        var opts = {'uri':couch
                   ,'method': "PUT"
                   ,'headers': {}
                   };
        superagent.put(couch)
        .auth(cuser,cpass)
        .type('json')
        .end(function(e,r){
            should.exist(r)
            // now populate that db with some docs
            superagent.post(couch+'/_bulk_docs')
            .type('json')
            .send(docs)
            .end(function(e,r){
                if(e) done(e)
                docs=[]
                _.each(r.body
                      ,function(resp){
                           resp.should.have.property('ok')
                           docs.push({doc:{_id:resp.id
                                          ,_rev:resp.rev}})
                       });
                return done()
            })
            return null
        })
    })
    after(function(done){
        var couch = 'http://'+chost+':'+cport+'/'+test_db
        // bail in development
        //console.log(couch)
        //return done()
        var opts = {'uri':couch
                   ,'method': "DELETE"
                   ,'headers': {}
                   };
        superagent.del(couch)
        .type('json')
        .auth(cuser,cpass)
        .end(function(e,r){
            return done(e)
        })
        return null
    })

    it('should screw up as I reset env vars to empty'
      ,function(done){
           try{
               setter({'db':test_db
                      ,'doc':'801245'
                      ,'year':2008
                      ,'state':'truckimputed'
                      ,'value':inprocess_string
                      }
                     ,function(err,state){
                          should.exist(err)
                          if(err) return done()
                          return done('failed to fail')
                      })

           }catch(err){
               return done()
           }
           return null
       })
    it('should obey couchdb and port parameters'
      ,function(done){
           setter({'db':test_db
                  ,'doc':'doc1'
                  ,'year':2008
                  ,'state':'vdsraw_chain_lengths'
                  ,'value':[11,23,19,22,15]
                  ,'couchdb':chost
                  ,'port':cport}
                 ,function(err,state){
                      should.not.exist(err)
                      getter({'db':test_db
                             ,'doc':'doc1'
                             ,'year':2008
                             ,'state':'vdsraw_chain_lengths'
                             ,'couchdb':chost
                             ,'port':cport}
                            ,function(err,state){
                                 should.not.exist(err)
                                 state.should.have.property('length',5)
                                 state.should.eql([11,23,19,22,15])
                                 return done()
                             })
                  })
       });
})
