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
    it('should get _attachments in place of year attachment for state'
      ,function(done){
           checker({'db':'vdsdata%2ftracking'
                   ,'doc':801230
                   ,'year':'_attachments'
                   ,'state':'801230_2008_001.png'}
                  ,function(err,state){
                       should.not.exist(err)
                       should.exist(state)
                       state.should.have.property('digest','md5-vaA0Xy7cpmyz1/1eWzZI+Q==')
                       return done()
                   })
       });
    it('should not get a missing attachment state'
      ,function(done){
           checker({'db':'vdsdata%2ftracking'
                   ,'doc':801230
                   ,'year':'_attachments'
                   ,'state':'801230_2008_raw_004.png'}
                  ,function(err,state){
                       should.not.exist(err)
                       should.not.exist(state)
                       return done()

                   })
       });
})
