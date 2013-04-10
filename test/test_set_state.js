/* global require console process describe it */

var should = require('should')
var setter = require('../couch_set_state')

var getter = require('couch_check_state')

var _ = require('lodash')
var superagent = require('superagent')

var env = process.env;
var cuser = env.COUCHDB_USER ;
var cpass = env.COUCHDB_PASS ;
var chost = env.COUCHDB_HOST || 'localhost';
var cport = env.COUCHDB_PORT || 5984;

var test_db ='test%2fbulk%2fdeleter'
var couch = 'http://'+chost+':'+cport+'/'+test_db
var date = new Date()
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
    var created_locally=false
    before(function(done){
        // create a test db, the put data into it
        var opts = {'uri':couch
                   ,'method': "PUT"
                   ,'headers': {}
                   };
        opts.headers.authorization = 'Basic ' + new Buffer(cuser + ':' + cpass).toString('base64')
        opts.headers['Content-Type'] =  'application/json'
        superagent.put(couch)
        .auth(cuser,cpass)
        .end(function(e,r){
            r.should.have.property('error',false)
            if(!e)
                created_locally=true
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
        if(!created_locally) return done()

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
            if(e) return done(e)
            return done()
        })
        return null
    })

    it('should set chain lengths state for doc1, 2007'
      ,function(done){
           setter({'db':test_db
                  ,'doc':'801245'
                  ,'year':2008
                  ,'state':'truckimputed'
                  ,'value':inprocess_string
                  }
                 ,function(err,state){
                      should.not.exist(err)
                      getter({'db':test_db
                             ,'doc':'801245'
                             ,'year':2008
                             ,'state':'truckimputed'
                             }
                            ,function(err,state){
                                 should.not.exist(err)
                                 state.should.eql(inprocess_string)
                                 return done()
                             })
                  })
       });
    it('should set inprocess string'
      ,function(done){
           setter({'db':test_db
                  ,'doc':'doc1'
                  ,'year':2008
                  ,'state':'vdsraw_chain_lengths'
                  ,'value':[11,23,19,22,15]}
                 ,function(err,state){
                      should.not.exist(err)
                      getter({'db':test_db
                             ,'doc':'doc1'
                             ,'year':2008
                             ,'state':'vdsraw_chain_lengths'}
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
           setter({'db':test_db
                  ,'doc':'doc1'
                  ,'year':2008
                  ,'state':'vdsraw_chain_lengths'
                  ,'value':[1111,23,19,22,15]}
                 ,function(err,state){
                      should.not.exist(err)
                      getter({'db':test_db
                             ,'doc':'doc1'
                             ,'year':2008
                             ,'state':'vdsraw_chain_lengths'}
                            ,function(err,state){
                                 should.not.exist(err)
                                 state.should.have.property('length',5)
                                 state.should.eql([1111,23,19,22,15])
                                 // now you don't
                                 setter({'db':test_db
                                        ,'doc':'doc1'
                                        ,'year':2008
                                        ,'state':'vdsraw_chain_lengths'
                                        ,'value':null}
                                       ,function(err,state){
                                            should.not.exist(err)
                                            getter({'db':test_db
                                                   ,'doc':'doc1'
                                                   ,'year':2008
                                                   ,'state':'vdsraw_chain_lengths'}
                                                  ,function(err,state){
                                                       should.not.exist(err)
                                                       should.not.exist(state)
                                                       return done()
                                                   })
                                        })

                             })
                  })

       });
})
