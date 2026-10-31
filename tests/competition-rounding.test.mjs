import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const html=readFileSync('olympic-lifting-tracker.html','utf8');
const source=html.slice(html.indexOf('function roundCompetitionWeight('),html.indexOf('function getCompPcts()'));
const c=vm.createContext({});vm.runInContext(source,c);
test('competition suggestions round down to whole kilos and preserve exact integers',()=>{for(const [input,expected] of [[65.9,65],[65.5,65],[65,65],[70*93/100,65],[110*98/100,107],[65.99999,65]])assert.equal(c.roundCompetitionWeight(input),expected);for(const input of ['',null,undefined,0,-1,Infinity,'wrong'])assert.equal(c.roundCompetitionWeight(input),null);});
test('competition references consistently use the highest displayed best',()=>{c.getMeetPBs=()=>({snatch:{weight:70},cj:{weight:110}});c.loadSettings=()=>({pbs:[{lift:'Snatch',weight:65.5},{lift:'Clean and Jerk',weight:100.5}]});assert.equal(c.getCompetitionReference('snatch'),70);assert.equal(c.getCompetitionReference('cj'),110);});
