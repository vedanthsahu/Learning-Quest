import{i as e,l as t,p as n,u as r}from"./index-Df5kztDf.js";import{D as i,Ja as a,Mn as o,Rt as s,W as c,ao as l,ar as u,ho as d,io as f,mn as p,na as m,nr as h,on as g,or as _,pa as v,ro as y,sn as b}from"./vanilla-MxdfNzg9.js";import{c as x,l as S,n as C,t as w}from"./constants-DSnYgfld.js";import{t as T}from"./extends-CvVTau-c.js";var E=w>=125?`uv1`:`uv2`,D=new i,O=new f,k=class extends g{constructor(){super(),this.isLineSegmentsGeometry=!0,this.type=`LineSegmentsGeometry`,this.setIndex([0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5]),this.setAttribute(`position`,new s([-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],3)),this.setAttribute(`uv`,new s([-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],2))}applyMatrix4(e){let t=this.attributes.instanceStart,n=this.attributes.instanceEnd;return t!==void 0&&(t.applyMatrix4(e),n.applyMatrix4(e),t.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}setPositions(e){let t;e instanceof Float32Array?t=e:Array.isArray(e)&&(t=new Float32Array(e));let n=new b(t,6,1);return this.setAttribute(`instanceStart`,new p(n,3,0)),this.setAttribute(`instanceEnd`,new p(n,3,3)),this.computeBoundingBox(),this.computeBoundingSphere(),this}setColors(e,t=3){let n;e instanceof Float32Array?n=e:Array.isArray(e)&&(n=new Float32Array(e));let r=new b(n,t*2,1);return this.setAttribute(`instanceColorStart`,new p(r,t,0)),this.setAttribute(`instanceColorEnd`,new p(r,t,t)),this}fromWireframeGeometry(e){return this.setPositions(e.attributes.position.array),this}fromEdgesGeometry(e){return this.setPositions(e.attributes.position.array),this}fromMesh(e){return this.fromWireframeGeometry(new d(e.geometry)),this}fromLineSegments(e){let t=e.geometry;return this.setPositions(t.attributes.position.array),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new i);let e=this.attributes.instanceStart,t=this.attributes.instanceEnd;e!==void 0&&t!==void 0&&(this.boundingBox.setFromBufferAttribute(e),D.setFromBufferAttribute(t),this.boundingBox.union(D))}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new v),this.boundingBox===null&&this.computeBoundingBox();let e=this.attributes.instanceStart,t=this.attributes.instanceEnd;if(e!==void 0&&t!==void 0){let n=this.boundingSphere.center;this.boundingBox.getCenter(n);let r=0;for(let i=0,a=e.count;i<a;i++)O.fromBufferAttribute(e,i),r=Math.max(r,n.distanceToSquared(O)),O.fromBufferAttribute(t,i),r=Math.max(r,n.distanceToSquared(O));this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&console.error(`THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.`,this)}}toJSON(){}applyMatrix(e){return console.warn(`THREE.LineSegmentsGeometry: applyMatrix() has been renamed to applyMatrix4().`),this.applyMatrix4(e)}},A=class extends k{constructor(){super(),this.isLineGeometry=!0,this.type=`LineGeometry`}setPositions(e){let t=e.length-3,n=new Float32Array(2*t);for(let r=0;r<t;r+=3)n[2*r]=e[r],n[2*r+1]=e[r+1],n[2*r+2]=e[r+2],n[2*r+3]=e[r+3],n[2*r+4]=e[r+4],n[2*r+5]=e[r+5];return super.setPositions(n),this}setColors(e,t=3){let n=e.length-t,r=new Float32Array(2*n);if(t===3)for(let i=0;i<n;i+=t)r[2*i]=e[i],r[2*i+1]=e[i+1],r[2*i+2]=e[i+2],r[2*i+3]=e[i+3],r[2*i+4]=e[i+4],r[2*i+5]=e[i+5];else for(let i=0;i<n;i+=t)r[2*i]=e[i],r[2*i+1]=e[i+1],r[2*i+2]=e[i+2],r[2*i+3]=e[i+3],r[2*i+4]=e[i+4],r[2*i+5]=e[i+5],r[2*i+6]=e[i+6],r[2*i+7]=e[i+7];return super.setColors(r,t),this}fromLine(e){let t=e.geometry;return this.setPositions(t.attributes.position.array),this}},j=class extends m{constructor(e){super({type:`LineMaterial`,uniforms:a.clone(a.merge([S.common,S.fog,{worldUnits:{value:1},linewidth:{value:1},resolution:{value:new y(1,1)},dashOffset:{value:0},dashScale:{value:1},dashSize:{value:1},gapSize:{value:1}}])),vertexShader:`
				#include <common>
				#include <fog_pars_vertex>
				#include <logdepthbuf_pars_vertex>
				#include <clipping_planes_pars_vertex>

				uniform float linewidth;
				uniform vec2 resolution;

				attribute vec3 instanceStart;
				attribute vec3 instanceEnd;

				#ifdef USE_COLOR
					#ifdef USE_LINE_COLOR_ALPHA
						varying vec4 vLineColor;
						attribute vec4 instanceColorStart;
						attribute vec4 instanceColorEnd;
					#else
						varying vec3 vLineColor;
						attribute vec3 instanceColorStart;
						attribute vec3 instanceColorEnd;
					#endif
				#endif

				#ifdef WORLD_UNITS

					varying vec4 worldPos;
					varying vec3 worldStart;
					varying vec3 worldEnd;

					#ifdef USE_DASH

						varying vec2 vUv;

					#endif

				#else

					varying vec2 vUv;

				#endif

				#ifdef USE_DASH

					uniform float dashScale;
					attribute float instanceDistanceStart;
					attribute float instanceDistanceEnd;
					varying float vLineDistance;

				#endif

				void trimSegment( const in vec4 start, inout vec4 end ) {

					// trim end segment so it terminates between the camera plane and the near plane

					// conservative estimate of the near plane
					float a = projectionMatrix[ 2 ][ 2 ]; // 3nd entry in 3th column
					float b = projectionMatrix[ 3 ][ 2 ]; // 3nd entry in 4th column
					float nearEstimate = - 0.5 * b / a;

					float alpha = ( nearEstimate - start.z ) / ( end.z - start.z );

					end.xyz = mix( start.xyz, end.xyz, alpha );

				}

				void main() {

					#ifdef USE_COLOR

						vLineColor = ( position.y < 0.5 ) ? instanceColorStart : instanceColorEnd;

					#endif

					#ifdef USE_DASH

						vLineDistance = ( position.y < 0.5 ) ? dashScale * instanceDistanceStart : dashScale * instanceDistanceEnd;
						vUv = uv;

					#endif

					float aspect = resolution.x / resolution.y;

					// camera space
					vec4 start = modelViewMatrix * vec4( instanceStart, 1.0 );
					vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );

					#ifdef WORLD_UNITS

						worldStart = start.xyz;
						worldEnd = end.xyz;

					#else

						vUv = uv;

					#endif

					// special case for perspective projection, and segments that terminate either in, or behind, the camera plane
					// clearly the gpu firmware has a way of addressing this issue when projecting into ndc space
					// but we need to perform ndc-space calculations in the shader, so we must address this issue directly
					// perhaps there is a more elegant solution -- WestLangley

					bool perspective = ( projectionMatrix[ 2 ][ 3 ] == - 1.0 ); // 4th entry in the 3rd column

					if ( perspective ) {

						if ( start.z < 0.0 && end.z >= 0.0 ) {

							trimSegment( start, end );

						} else if ( end.z < 0.0 && start.z >= 0.0 ) {

							trimSegment( end, start );

						}

					}

					// clip space
					vec4 clipStart = projectionMatrix * start;
					vec4 clipEnd = projectionMatrix * end;

					// ndc space
					vec3 ndcStart = clipStart.xyz / clipStart.w;
					vec3 ndcEnd = clipEnd.xyz / clipEnd.w;

					// direction
					vec2 dir = ndcEnd.xy - ndcStart.xy;

					// account for clip-space aspect ratio
					dir.x *= aspect;
					dir = normalize( dir );

					#ifdef WORLD_UNITS

						// get the offset direction as perpendicular to the view vector
						vec3 worldDir = normalize( end.xyz - start.xyz );
						vec3 offset;
						if ( position.y < 0.5 ) {

							offset = normalize( cross( start.xyz, worldDir ) );

						} else {

							offset = normalize( cross( end.xyz, worldDir ) );

						}

						// sign flip
						if ( position.x < 0.0 ) offset *= - 1.0;

						float forwardOffset = dot( worldDir, vec3( 0.0, 0.0, 1.0 ) );

						// don't extend the line if we're rendering dashes because we
						// won't be rendering the endcaps
						#ifndef USE_DASH

							// extend the line bounds to encompass  endcaps
							start.xyz += - worldDir * linewidth * 0.5;
							end.xyz += worldDir * linewidth * 0.5;

							// shift the position of the quad so it hugs the forward edge of the line
							offset.xy -= dir * forwardOffset;
							offset.z += 0.5;

						#endif

						// endcaps
						if ( position.y > 1.0 || position.y < 0.0 ) {

							offset.xy += dir * 2.0 * forwardOffset;

						}

						// adjust for linewidth
						offset *= linewidth * 0.5;

						// set the world position
						worldPos = ( position.y < 0.5 ) ? start : end;
						worldPos.xyz += offset;

						// project the worldpos
						vec4 clip = projectionMatrix * worldPos;

						// shift the depth of the projected points so the line
						// segments overlap neatly
						vec3 clipPose = ( position.y < 0.5 ) ? ndcStart : ndcEnd;
						clip.z = clipPose.z * clip.w;

					#else

						vec2 offset = vec2( dir.y, - dir.x );
						// undo aspect ratio adjustment
						dir.x /= aspect;
						offset.x /= aspect;

						// sign flip
						if ( position.x < 0.0 ) offset *= - 1.0;

						// endcaps
						if ( position.y < 0.0 ) {

							offset += - dir;

						} else if ( position.y > 1.0 ) {

							offset += dir;

						}

						// adjust for linewidth
						offset *= linewidth;

						// adjust for clip-space to screen-space conversion // maybe resolution should be based on viewport ...
						offset /= resolution.y;

						// select end
						vec4 clip = ( position.y < 0.5 ) ? clipStart : clipEnd;

						// back to clip space
						offset *= clip.w;

						clip.xy += offset;

					#endif

					gl_Position = clip;

					vec4 mvPosition = ( position.y < 0.5 ) ? start : end; // this is an approximation

					#include <logdepthbuf_vertex>
					#include <clipping_planes_vertex>
					#include <fog_vertex>

				}
			`,fragmentShader:`
				uniform vec3 diffuse;
				uniform float opacity;
				uniform float linewidth;

				#ifdef USE_DASH

					uniform float dashOffset;
					uniform float dashSize;
					uniform float gapSize;

				#endif

				varying float vLineDistance;

				#ifdef WORLD_UNITS

					varying vec4 worldPos;
					varying vec3 worldStart;
					varying vec3 worldEnd;

					#ifdef USE_DASH

						varying vec2 vUv;

					#endif

				#else

					varying vec2 vUv;

				#endif

				#include <common>
				#include <fog_pars_fragment>
				#include <logdepthbuf_pars_fragment>
				#include <clipping_planes_pars_fragment>

				#ifdef USE_COLOR
					#ifdef USE_LINE_COLOR_ALPHA
						varying vec4 vLineColor;
					#else
						varying vec3 vLineColor;
					#endif
				#endif

				vec2 closestLineToLine(vec3 p1, vec3 p2, vec3 p3, vec3 p4) {

					float mua;
					float mub;

					vec3 p13 = p1 - p3;
					vec3 p43 = p4 - p3;

					vec3 p21 = p2 - p1;

					float d1343 = dot( p13, p43 );
					float d4321 = dot( p43, p21 );
					float d1321 = dot( p13, p21 );
					float d4343 = dot( p43, p43 );
					float d2121 = dot( p21, p21 );

					float denom = d2121 * d4343 - d4321 * d4321;

					float numer = d1343 * d4321 - d1321 * d4343;

					mua = numer / denom;
					mua = clamp( mua, 0.0, 1.0 );
					mub = ( d1343 + d4321 * ( mua ) ) / d4343;
					mub = clamp( mub, 0.0, 1.0 );

					return vec2( mua, mub );

				}

				void main() {

					#include <clipping_planes_fragment>

					#ifdef USE_DASH

						if ( vUv.y < - 1.0 || vUv.y > 1.0 ) discard; // discard endcaps

						if ( mod( vLineDistance + dashOffset, dashSize + gapSize ) > dashSize ) discard; // todo - FIX

					#endif

					float alpha = opacity;

					#ifdef WORLD_UNITS

						// Find the closest points on the view ray and the line segment
						vec3 rayEnd = normalize( worldPos.xyz ) * 1e5;
						vec3 lineDir = worldEnd - worldStart;
						vec2 params = closestLineToLine( worldStart, worldEnd, vec3( 0.0, 0.0, 0.0 ), rayEnd );

						vec3 p1 = worldStart + lineDir * params.x;
						vec3 p2 = rayEnd * params.y;
						vec3 delta = p1 - p2;
						float len = length( delta );
						float norm = len / linewidth;

						#ifndef USE_DASH

							#ifdef USE_ALPHA_TO_COVERAGE

								float dnorm = fwidth( norm );
								alpha = 1.0 - smoothstep( 0.5 - dnorm, 0.5 + dnorm, norm );

							#else

								if ( norm > 0.5 ) {

									discard;

								}

							#endif

						#endif

					#else

						#ifdef USE_ALPHA_TO_COVERAGE

							// artifacts appear on some hardware if a derivative is taken within a conditional
							float a = vUv.x;
							float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
							float len2 = a * a + b * b;
							float dlen = fwidth( len2 );

							if ( abs( vUv.y ) > 1.0 ) {

								alpha = 1.0 - smoothstep( 1.0 - dlen, 1.0 + dlen, len2 );

							}

						#else

							if ( abs( vUv.y ) > 1.0 ) {

								float a = vUv.x;
								float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
								float len2 = a * a + b * b;

								if ( len2 > 1.0 ) discard;

							}

						#endif

					#endif

					vec4 diffuseColor = vec4( diffuse, alpha );
					#ifdef USE_COLOR
						#ifdef USE_LINE_COLOR_ALPHA
							diffuseColor *= vLineColor;
						#else
							diffuseColor.rgb *= vLineColor;
						#endif
					#endif

					#include <logdepthbuf_fragment>

					gl_FragColor = diffuseColor;

					#include <tonemapping_fragment>
					#include <${w>=154?`colorspace_fragment`:`encodings_fragment`}>
					#include <fog_fragment>
					#include <premultiplied_alpha_fragment>

				}
			`,clipping:!0}),this.isLineMaterial=!0,this.onBeforeCompile=function(){this.transparent?this.defines.USE_LINE_COLOR_ALPHA=`1`:delete this.defines.USE_LINE_COLOR_ALPHA},Object.defineProperties(this,{color:{enumerable:!0,get:function(){return this.uniforms.diffuse.value},set:function(e){this.uniforms.diffuse.value=e}},worldUnits:{enumerable:!0,get:function(){return`WORLD_UNITS`in this.defines},set:function(e){e===!0?this.defines.WORLD_UNITS=``:delete this.defines.WORLD_UNITS}},linewidth:{enumerable:!0,get:function(){return this.uniforms.linewidth.value},set:function(e){this.uniforms.linewidth.value=e}},dashed:{enumerable:!0,get:function(){return`USE_DASH`in this.defines},set(e){!!e!=`USE_DASH`in this.defines&&(this.needsUpdate=!0),e===!0?this.defines.USE_DASH=``:delete this.defines.USE_DASH}},dashScale:{enumerable:!0,get:function(){return this.uniforms.dashScale.value},set:function(e){this.uniforms.dashScale.value=e}},dashSize:{enumerable:!0,get:function(){return this.uniforms.dashSize.value},set:function(e){this.uniforms.dashSize.value=e}},dashOffset:{enumerable:!0,get:function(){return this.uniforms.dashOffset.value},set:function(e){this.uniforms.dashOffset.value=e}},gapSize:{enumerable:!0,get:function(){return this.uniforms.gapSize.value},set:function(e){this.uniforms.gapSize.value=e}},opacity:{enumerable:!0,get:function(){return this.uniforms.opacity.value},set:function(e){this.uniforms.opacity.value=e}},resolution:{enumerable:!0,get:function(){return this.uniforms.resolution.value},set:function(e){this.uniforms.resolution.value.copy(e)}},alphaToCoverage:{enumerable:!0,get:function(){return`USE_ALPHA_TO_COVERAGE`in this.defines},set:function(e){!!e!=`USE_ALPHA_TO_COVERAGE`in this.defines&&(this.needsUpdate=!0),e===!0?(this.defines.USE_ALPHA_TO_COVERAGE=``,this.extensions.derivatives=!0):(delete this.defines.USE_ALPHA_TO_COVERAGE,this.extensions.derivatives=!1)}}}),this.setValues(e)}},M=new l,N=new f,P=new f,F=new l,I=new l,L=new l,R=new f,z=new u,B=new o,V=new f,H=new i,U=new v,W=new l,G,K;function q(e,t,n){return W.set(0,0,-t,1).applyMatrix4(e.projectionMatrix),W.multiplyScalar(1/W.w),W.x=K/n.width,W.y=K/n.height,W.applyMatrix4(e.projectionMatrixInverse),W.multiplyScalar(1/W.w),Math.abs(Math.max(W.x,W.y))}function J(e,t){let n=e.matrixWorld,r=e.geometry,i=r.attributes.instanceStart,a=r.attributes.instanceEnd,o=Math.min(r.instanceCount,i.count);for(let r=0,s=o;r<s;r++){B.start.fromBufferAttribute(i,r),B.end.fromBufferAttribute(a,r),B.applyMatrix4(n);let o=new f,s=new f;G.distanceSqToSegment(B.start,B.end,s,o),s.distanceTo(o)<K*.5&&t.push({point:s,pointOnLine:o,distance:G.origin.distanceTo(s),object:e,face:null,faceIndex:r,uv:null,[E]:null})}}function Y(e,t,n){let r=t.projectionMatrix,i=e.material.resolution,a=e.matrixWorld,o=e.geometry,s=o.attributes.instanceStart,c=o.attributes.instanceEnd,l=Math.min(o.instanceCount,s.count),u=-t.near;G.at(1,L),L.w=1,L.applyMatrix4(t.matrixWorldInverse),L.applyMatrix4(r),L.multiplyScalar(1/L.w),L.x*=i.x/2,L.y*=i.y/2,L.z=0,R.copy(L),z.multiplyMatrices(t.matrixWorldInverse,a);for(let t=0,o=l;t<o;t++){if(F.fromBufferAttribute(s,t),I.fromBufferAttribute(c,t),F.w=1,I.w=1,F.applyMatrix4(z),I.applyMatrix4(z),F.z>u&&I.z>u)continue;if(F.z>u){let e=F.z-I.z,t=(F.z-u)/e;F.lerp(I,t)}else if(I.z>u){let e=I.z-F.z,t=(I.z-u)/e;I.lerp(F,t)}F.applyMatrix4(r),I.applyMatrix4(r),F.multiplyScalar(1/F.w),I.multiplyScalar(1/I.w),F.x*=i.x/2,F.y*=i.y/2,I.x*=i.x/2,I.y*=i.y/2,B.start.copy(F),B.start.z=0,B.end.copy(I),B.end.z=0;let o=B.closestPointToPointParameter(R,!0);B.at(o,V);let l=h.lerp(F.z,I.z,o),d=l>=-1&&l<=1,p=R.distanceTo(V)<K*.5;if(d&&p){B.start.fromBufferAttribute(s,t),B.end.fromBufferAttribute(c,t),B.start.applyMatrix4(a),B.end.applyMatrix4(a);let r=new f,i=new f;G.distanceSqToSegment(B.start,B.end,i,r),n.push({point:i,pointOnLine:r,distance:G.origin.distanceTo(i),object:e,face:null,faceIndex:t,uv:null,[E]:null})}}}var X=class extends _{constructor(e=new k,t=new j({color:Math.random()*16777215})){super(e,t),this.isLineSegments2=!0,this.type=`LineSegments2`}computeLineDistances(){let e=this.geometry,t=e.attributes.instanceStart,n=e.attributes.instanceEnd,r=new Float32Array(2*t.count);for(let e=0,i=0,a=t.count;e<a;e++,i+=2)N.fromBufferAttribute(t,e),P.fromBufferAttribute(n,e),r[i]=i===0?0:r[i-1],r[i+1]=r[i]+N.distanceTo(P);let i=new b(r,2,1);return e.setAttribute(`instanceDistanceStart`,new p(i,1,0)),e.setAttribute(`instanceDistanceEnd`,new p(i,1,1)),this}raycast(e,t){let n=this.material.worldUnits,r=e.camera;r===null&&!n&&console.error(`LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2 while worldUnits is set to false.`);let i=e.params.Line2===void 0?0:e.params.Line2.threshold||0;G=e.ray;let a=this.matrixWorld,o=this.geometry,s=this.material;K=s.linewidth+i,o.boundingSphere===null&&o.computeBoundingSphere(),U.copy(o.boundingSphere).applyMatrix4(a);let c;if(c=n?K*.5:q(r,Math.max(r.near,U.distanceToPoint(G.origin)),s.resolution),U.radius+=c,G.intersectsSphere(U)===!1)return;o.boundingBox===null&&o.computeBoundingBox(),H.copy(o.boundingBox).applyMatrix4(a);let l;l=n?K*.5:q(r,Math.max(r.near,H.distanceToPoint(G.origin)),s.resolution),H.expandByScalar(l),G.intersectsBox(H)!==!1&&(n?J(this,t):Y(this,r,t))}onBeforeRender(e){let t=this.material.uniforms;t&&t.resolution&&(e.getViewport(M),this.material.uniforms.resolution.value.set(M.z,M.w))}},Z=class extends X{constructor(e=new A,t=new j({color:Math.random()*16777215})){super(e,t),this.isLine2=!0,this.type=`Line2`}},Q=n(r()),ee=Q.forwardRef(function({points:e,color:t=16777215,vertexColors:n,linewidth:r,lineWidth:i,segments:a,dashed:o,...s},u){var d;let p=x(e=>e.size),m=Q.useMemo(()=>a?new X:new Z,[a]),[h]=Q.useState(()=>new j),g=(n==null||(d=n[0])==null?void 0:d.length)===4?4:3,_=Q.useMemo(()=>{let r=a?new k:new A,i=e.map(e=>{let t=Array.isArray(e);return e instanceof f||e instanceof l?[e.x,e.y,e.z]:e instanceof y?[e.x,e.y,0]:t&&e.length===3?[e[0],e[1],e[2]]:t&&e.length===2?[e[0],e[1],0]:e});if(r.setPositions(i.flat()),n){t=16777215;let e=n.map(e=>e instanceof c?e.toArray():e);r.setColors(e.flat(),g)}return r},[e,a,n,g]);return Q.useLayoutEffect(()=>{m.computeLineDistances()},[e,m]),Q.useLayoutEffect(()=>{o?h.defines.USE_DASH=``:delete h.defines.USE_DASH,h.needsUpdate=!0},[o,h]),Q.useEffect(()=>()=>{_.dispose(),h.dispose()},[_]),Q.createElement(`primitive`,T({object:m,ref:u},s),Q.createElement(`primitive`,{object:_,attach:`geometry`}),Q.createElement(`primitive`,T({object:h,attach:`material`,color:t,vertexColors:!!n,resolution:[p.width,p.height],linewidth:r??i??1,dashed:o,transparent:g===4},s)))}),$=t(),te=class extends Q.Component{state={failed:!1};static getDerivedStateFromError(){return{failed:!0}}render(){return this.state.failed?this.props.fallback:this.props.children}};function ne({nodes:e,selectedId:t,onSelect:n,orbit:r,rotation:i,routeIds:a}){let o=(0,Q.useMemo)(()=>a.map(t=>e.find(e=>e.id===t)).filter(Boolean),[a,e]),s=(0,Q.useMemo)(()=>o.slice(1).map((e,t)=>{let n=new f(...o[t].position),r=new f(...e.position);return Array.from({length:17},(e,t)=>n.clone().lerp(r,t/16).normalize().multiplyScalar(1.73+.1*Math.sin(Math.PI*t/16)).toArray())}),[o]);return(0,$.jsxs)(`group`,{rotation:i,children:[!r&&s.map((e,t)=>(0,$.jsx)(ee,{points:e,color:`#f4a077`,lineWidth:1.4},o[t].id)),(0,$.jsxs)(`mesh`,{onClick:e=>e.stopPropagation(),children:[(0,$.jsx)(`sphereGeometry`,{args:[r?.85:1.61,48,32]}),(0,$.jsx)(`meshStandardMaterial`,{color:r?`#253d58`:`#10293e`,roughness:.72,metalness:.25})]}),!r&&(0,$.jsxs)(`mesh`,{children:[(0,$.jsx)(`sphereGeometry`,{args:[1.625,32,18]}),(0,$.jsx)(`meshBasicMaterial`,{color:`#46738b`,wireframe:!0,transparent:!0,opacity:.33})]}),r&&(0,$.jsx)(`group`,{rotation:[.34,0,-.24],children:[1.18,1.32,1.51].map((e,t)=>(0,$.jsxs)(`mesh`,{rotation:[Math.PI/2,0,0],children:[(0,$.jsx)(`ringGeometry`,{args:[e,e+.06+t*.025,100]}),(0,$.jsx)(`meshBasicMaterial`,{color:t===1?`#eed1a5`:`#8ebdcf`,side:2,transparent:!0,opacity:.8-t*.13})]},e))}),e.map(e=>(0,$.jsx)(`group`,{position:e.position,children:(0,$.jsxs)(`mesh`,{onClick:t=>{t.stopPropagation(),t.delta<6&&n(e.id)},children:[(0,$.jsx)(`sphereGeometry`,{args:[r?t===e.id?.26:.18:t===e.id?.09:.052,16,12]}),(0,$.jsx)(`meshStandardMaterial`,{color:t===e.id?`#fff1d9`:e.color,emissive:e.color,emissiveIntensity:t===e.id?.9:.3,roughness:.45})]})},e.id))]})}var re=[];function ie({nodes:t,selectedId:n,onSelect:r,orbit:i=!1,angle:a=0,routeIds:o=re}){let[s,c]=(0,Q.useState)(!1),[l,u]=(0,Q.useState)(!1),[d,f]=(0,Q.useState)({id:n,angles:[0,0]}),p=d.id===n?d.angles:[0,0],[m,h]=(0,Q.useState)(null),g=t.find(e=>e.id===n),_=i?[.26,a,0]:e(g?.position||[0,0,1]),v=[_[0]+p[0],_[1]+p[1],0],y=(0,$.jsxs)(`div`,{className:`learning-scene-fallback`,children:[(0,$.jsx)(`strong`,{children:`3D view unavailable`}),(0,$.jsx)(`p`,{children:`Use the chapter or book selector alongside this view. Your progress is unchanged.`})]});return s?y:(0,$.jsxs)(te,{fallback:y,children:[(0,$.jsx)(`div`,{className:`learning-scene ${i?`is-orbit`:``}`,"data-ready":l,role:`img`,"aria-label":i?`Books orbit a ringed planet. Select a book with the controls.`:`Chapter globe. Drag horizontally to rotate; use the chapter selector for keyboard access.`,onPointerDown:e=>{i||e.button!==0||h({x:e.clientX,y:e.clientY,drag:p})},onPointerMove:e=>{!m||i||f({id:n,angles:[Math.min(.9,Math.max(-.9,m.drag[0]+(e.clientY-m.y)*.004)),m.drag[1]+(e.clientX-m.x)*.008]})},onPointerUp:()=>h(null),onPointerCancel:()=>h(null),onPointerLeave:()=>h(null),children:(0,$.jsxs)(C,{frameloop:`demand`,dpr:[1,1.5],camera:{position:[0,0,i?7.5:5.6],fov:44},gl:{antialias:!0,alpha:!0},fallback:y,onCreated:({gl:e})=>{e.domElement.addEventListener(`webglcontextlost`,()=>c(!0),{once:!0}),u(!0)},children:[(0,$.jsx)(`ambientLight`,{intensity:1.4}),(0,$.jsx)(`directionalLight`,{position:[3,4,5],intensity:3,color:`#dcf2ff`}),(0,$.jsx)(`directionalLight`,{position:[-3,-2,-2],intensity:1.2,color:`#5b8bad`}),(0,$.jsx)(ne,{nodes:t,selectedId:n,orbit:i,rotation:v,routeIds:o,onSelect:e=>{f({id:e,angles:[0,0]}),r(e)}})]})}),!i&&(0,$.jsx)(`button`,{className:`globe-reset`,onClick:()=>f({id:n,angles:[0,0]}),children:`Centre selected chapter`})]})}export{ie as default};