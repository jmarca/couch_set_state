/* global require console process describe it */

var should = require('should')
var checker = require('../couch_check_state')

describe('get vds id states',function(){
    it('should get chain lengths state for 801230, 2007'
      ,function(done){
           checker({'db':'vdsdata%2ftracking'
                   ,'doc':801230
                   ,'year':2008
                   ,'state':'vdsraw_chain_lengths'}
                  ,function(err,state){
                       should.not.exist(err)
                       state.should.have.property('length',5)
                       state.should.eql([11,23,19,22,15])
                       return done()
                   })
       });
})
