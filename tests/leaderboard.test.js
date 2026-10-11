import {test} from 'node:test';
import assert from 'node:assert/strict';
import {rankingPage} from '../server/leaderboard.js';
test('paginación acepta enteros y rechaza offsets inválidos',()=>{
 assert.equal(rankingPage(),1);assert.equal(rankingPage('2'),2);
 for(const value of ['0','-1','1.5','oops','1000001',Infinity])assert.throws(()=>rankingPage(value));
});
