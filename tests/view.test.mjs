import assert from 'node:assert/strict';
import {View} from '../next/view.js';
import {T} from '../next/models.js';
let rect={width:390,height:650},sizes=[];
let view=Object.assign(Object.create(View.prototype),{canvas:{getBoundingClientRect:()=>rect},renderer:{setSize:(...x)=>sizes.push(x),shadowMap:{}},camera:new T.OrthographicCamera(-18,18,28,-28,.1,180),focus:{x:3,z:-2},zoom:1.15,mode:'battle'});
view.resize();let original=view.camera.projectionMatrix.elements.slice();
for(let i=0;i<5;i++){rect={width:844,height:240};view.resize();assert.ok(Math.abs((view.camera.right-view.camera.left)/(view.camera.top-view.camera.bottom)-844/240)<1e-9);rect={width:390,height:650};view.resize();assert.deepEqual(view.camera.projectionMatrix.elements,original)}
assert.deepEqual(view.focus,{x:3,z:-2});assert.equal(view.zoom,1.15);
let n=sizes.length;view.resize();assert.equal(sizes.length,n,'unchanged viewport must not recreate the buffer');
rect={width:0,height:0};view.resize();assert.equal(view.width,1);assert.equal(view.height,1);assert.ok(view.camera.projectionMatrix.elements.every(Number.isFinite));
console.log('PASS repeated portrait/landscape round trips preserve projection, zoom and camera position');
