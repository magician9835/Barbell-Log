import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const html=readFileSync('olympic-lifting-tracker.html','utf8');
const source=html.slice(html.indexOf('function roundCompetitionWeight('),html.indexOf('function getCompPcts()'));
const c=vm.createContext({});vm.runInContext(readFileSync('workout-model.js','utf8'),c);vm.runInContext(readFileSync('competition-warmup-model.js','utf8'),c);vm.runInContext(source,c);
test('competition suggestions round down to whole kilos and preserve exact integers',()=>{for(const [input,expected] of [[65.9,65],[65.5,65],[65,65],[70*93/100,65],[110*98/100,107],[65.99999,65]])assert.equal(c.roundCompetitionWeight(input),expected);for(const input of ['',null,undefined,0,-1,Infinity,'wrong'])assert.equal(c.roundCompetitionWeight(input),null);});
test('competition references consistently use the highest displayed best',()=>{c.getMeetPBs=()=>({snatch:{weight:70},cj:{weight:110}});c.loadSettings=()=>({pbs:[{lift:'Snatch',weight:65.5},{lift:'Clean and Jerk',weight:100.5}]});assert.equal(c.getCompetitionReference('snatch'),70);assert.equal(c.getCompetitionReference('cj'),110);});

const clockSource=html.slice(html.indexOf('function addMinutes('),html.indexOf('function renderWarmup()'));
vm.runInContext(clockSource,c);
const ladderSource=html.slice(html.indexOf('function buildWarmupLadder('),html.indexOf('function addMinutes('));
vm.runInContext(ladderSource,c);
test('warm-up clock normalises fractional minutes and midnight without minute 60',()=>{assert.equal(c.addMinutes('09:00',59.6),'10:00');assert.equal(c.addMinutes('23:59',2),'00:01');assert.equal(c.addMinutes('00:00',-0.6),'23:59');assert.equal(c.addMinutes(null,1),null);});
test('low openers never repeat bare-bar warm-ups or include the opener as a warm-up',()=>{for(const opener of [20,25,26,60,100]){const ladder=c.buildWarmupLadder(opener);assert.equal(new Set(ladder.map(s=>s.kg)).size,ladder.length);assert.ok(ladder.every(s=>s.kg<opener));}});
