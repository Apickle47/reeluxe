/* Reproducible robustness studies and explicit filter contracts. No network calls. */
(()=>{
const D=JSON.parse(document.getElementById('data').textContent),A=D.advanced;
const $=id=>document.getElementById(id);
const money=x=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(x);
const pct=x=>(100*x).toFixed(1)+'%';
const signed=x=>(x>=0?'+':'')+pct(x);
const num=x=>x.toLocaleString('en-US');
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const table=(headers,rows)=>`<div class="scroll"><table class="study-table"><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(v=>`<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const fixed='<p class="scope-label">FIXED STUDY · Jan–Jun source data · global filters do not change this panel.</p>';

// Every visual/data table states which filters apply. Observer updates machine/guest labels.
const contracts={
 kpis:'machine',bottomTable:'machine',scatter:'machine',zhist:'machine',monthTable:'machine',downTable:'machine',
 ptiles:'guest',groupTable:'guest',compTable:'guest',demand:'demand',conc:'concentration',
 heat:'FIXED · Jan–Jun · all zones/configurations · no filters',walk:'FIXED · Jan–Jun · closure Mar 3–Apr 6 · no filters',
 walkTable:'FIXED · Jan–Jun · before/during/after closure · no filters',faultHour:'FIXED · Jan–Jun · all tickets, local opening hour · no filters',
 comp:'FIXED · Jan–Jun redemptions, local gaming weeks · no filters',fc:'FIXED · May–Jun holdout · Jan–Apr training · no filters',
 fcTable:'FIXED · May–Jun holdout by weekday · no filters',hourlyLoss:'FIXED · Jan–Jun · manufacturer × weekday × hour benchmark · no filters',
 actions:'DECISION · July 1–30 · one funded action · no filters',notFunded:'DECISION · July 1–30 alternatives · no filters'};
for(const [id,kind] of Object.entries(contracts)){
 const node=$(id);if(!node)throw Error('Missing scope target '+id);
 const label=document.createElement('p');label.className='scope-label';label.dataset.scope=kind;label.id='scope-'+id;node.before(label);
 node.setAttribute('aria-describedby',label.id);
}
function scope(){
 const selected=id=>$(id).selectedOptions[0]?.textContent||'All';
 const period=selected('fFrom')+' → '+selected('fTo');
 document.querySelectorAll('[data-scope]').forEach(n=>{const k=n.dataset.scope;
 n.textContent=k==='machine'?`FILTERED · ${period} · ${selected('fZone')} · ${selected('fBank')} · guest filters do not apply`:
 k==='guest'?`FILTERED · ${period} · ${selected('fTier')} · ${selected('fRegion')} · location filters do not apply`:
 k==='concentration'?`FIXED Jan–Jun ranks · ${selected('fRegion')} · period, tier, zone and bank do not apply`:
 k==='demand'?`FILTERED PERIOD · ${period} · daily chart is whole-floor only; zone/bank detail is in the monthly table · guest filters do not apply`:k;
 });
}
new MutationObserver(scope).observe($('fNote'),{childList:true});scope();

$('moversStudy').innerHTML='<h3>Four movers: does the same machine change with its location?</h3>'+fixed+
table(['Machine / move','Matched window','Theo/h before → after','Same-game source-zone stayers','Relative change vs. stayers','95% time-block interval'],A.movers.map(m=>[
 `<b>${m.id}</b><br>${esc(m.from)} → ${esc(m.to)}<br>${m.date}`,
 `${m.daysEachSide} days each side; move day excluded`,`${money(m.preTph)} → ${money(m.postTph)}`,
 `${m.controls} machines<br>${money(m.controlPreTph)} → ${money(m.controlPostTph)}`,signed(m.relativeEffect),`${signed(m.ci95[0])} to ${signed(m.ci95[1])}`]))+
 '<p class="study-note"><b>M-1152 is the strongest location clue.</b> Its Back Forty → Main Entrance move is associated with a large increase using either origin- or destination-zone controls. The other three intervals include no change. These are four observational cases, not four randomized experiments; moving a machine may redistribute existing play.</p>'+
 '<details><summary>Matching, placebo checks and reproducibility</summary><p class="study-note">Outcome: ratio-of-sums theo per available hour. Controls use the same configuration, stay in place, and are observed on every matched date. Relative change = (mover post/pre) ÷ (control post/pre) − 1. Paired within-period 7-day moving-block bootstrap, 2,000 draws; intervals are pointwise and do not correct four exploratory comparisons. No control is selected by its post-move earnings. Destination peers test sensitivity.</p>'+
 table(['Machine','Pre-period placebo change','Destination peers','Effect vs. destination peers'],A.movers.map(m=>[m.id,signed(m.prePlacebo),m.destinationControls,m.destinationEffect==null?'No eligible peers':signed(m.destinationEffect)]))+
 '<p class="study-note">The placebo splits each pre-window in half. Large placebo changes on three machines weaken a simple causal reading. M-1299 has only 20 post-move days; all others have 28. Source: advanced_analysis.py, movers.</p></details>';

const P=A.pretrend;
$('pretrendStudy').innerHTML='<h3>Did Back Forty and other zones move together before the closure?</h3>'+fixed+
 `<p class="study-note"><b>The parallel-trend assumption is questionable.</b> Across ${P.days} pre-closure days, Back Forty’s theo/h relative to other zones changed ${signed(P.relativeSlopePerWeek)} per week (95% block interval ${signed(P.slopeCI95[0])} to ${signed(P.slopeCI95[1])}). A February 3 placebo split shows ${signed(P.placeboEffect)} without the closure. The matched 35-day closure comparison is ${signed(P.matched35DayClosureEffect)}; do not interpret all of it as a walkway effect.</p>`+
 table(['Pre-closure week','Back Forty theo/h','Other-zone theo/h'],P.weekly.map(r=>[r[0],money(r[1]),money(r[2])]))+
 `<details><summary>Trend model and composition sensitivity</summary><p class="study-note">Fit log(Back Forty theo/h ÷ other-zone theo/h) on elapsed weeks and weekday indicators, Jan 6–Mar 2. Residual moving-block bootstrap: seven-day blocks, 2,000 draws. The ${P.balancedPanelMachines}-machine balanced panel removes movers and machines not observed every day through Apr 6; its pretrend is ${signed(P.balancedPanelSlopePerWeek)}/week. This sensitivity is descriptive, not a second independent test. Closure windows: Jan 27–Mar 2 versus Mar 3–Apr 6, both 35 days. One treated zone and one closure prevent strong causal identification.</p></details>`;

const L=A.matchedDowntime;
$('matchedLoss').innerHTML='<h3>Downtime: same-game peers and customer switching</h3>'+fixed+
 `<p class="study-note">Compare each machine with <b>other machines of the same configuration and actual zone, weekday and local hour</b>. ${pct(L.zoneMatchedShare)} of downtime hours have at least three peers and 24 peer available hours. Sparse cells fall back to same-configuration weekday/hour peers across zones. The machine’s own play is excluded. Estimated machine-level loss: <b>${money(L.lostCoinIn)} wagers; ${money(L.lostTheo)} theo</b>.</p>`+
 '<label class="study-note" for="switching">Share of interrupted play retained elsewhere in this casino: <output id="switchValue">50%</output></label><br><input id="switching" type="range" min="0" max="100" value="50" step="5" aria-describedby="switchAssumption"><p id="switchResult" class="answer"></p>'+
 table(['Play retained elsewhere','Property-level forgone theo'],L.substitution.map(r=>[pct(r[0]),money(r[1])]))+
 '<p class="study-note" id="switchAssumption">Switching is an assumption, not measured from these meters. Estimates range from zero property loss at full retention to the full machine-level amount at no retention. Customer mix, capacity and correlated outages still matter. This is gross expected win before incremental costs, not profit. The simpler manufacturer-rate table above remains a benchmark.</p>';
function switching(){const s=+$('switching').value/100;$('switchValue').textContent=pct(s);$('switchResult').textContent=`At ${pct(s)} retention elsewhere: ${money(L.lostTheo*(1-s))} expected house win forgone property-wide over six months.`;}
$('switching').oninput=switching;switching();

const R=A.rolling;
$('rollingStudy').innerHTML='<h3>Historical backtests and forecast uncertainty</h3>'+fixed+
 table(['Forecast month','Training ends','Training / test days','Weekday MAE','Flat MAE'],R.folds.map(f=>[f.month,f.trainEnd,`${f.trainDays} / ${f.testDays}`,money(f.maeModel),money(f.maeBaseline)]))+
 `<p class="study-note">All three historical tests beat the flat baseline. The original Jan–Apr-fit / May–Jun-test point forecast is unchanged: <b>R² ${D.forecast.r2Weekday}</b>. These additional diagnostics were constructed after viewing that result; they are not a new untouched test or a model-selection contest.</p>`+
 `<p class="study-note"><b>Nominal 90% prediction intervals:</b> calibrated using ${R.calibrationDays} out-of-sample February–April absolute errors only, rank ${R.rank}; half-width ${money(R.radius)}. May–June observed coverage: ${pct(R.coverage)} (${R.intervals.filter(r=>r[5]).length}/${R.intervals.length} days), mean width ${money(R.meanWidth)}. Conservative on this holdout. Temporal drift and dependence prevent a distribution-free coverage guarantee.</p><div id="intervalChart"></div>`+
 '<details><summary>All held-out forecasts, interval bounds and outcomes</summary>'+table(['Date','Forecast','Lower','Upper','Actual','Covered'],R.intervals.map(r=>[r[0],money(r[1]),money(r[2]),money(r[3]),money(r[4]),r[5]?'Yes':'No']))+'</details>';
// Native SVG uncertainty band, without altering the existing forecast chart.
{const rows=R.intervals,W=1000,H=260,pad=55,max=Math.max(...rows.map(r=>Math.max(r[3],r[4])))*1.05;
const x=i=>pad+i*(W-pad-15)/(rows.length-1),y=v=>H-35-v*(H-55)/max;
const path=k=>rows.map((r,i)=>(i?'L':'M')+x(i)+','+y(r[k])).join(' ');
const band=rows.map((r,i)=>`${x(i)},${y(r[2])}`).concat([...rows].reverse().map((r,i)=>`${x(rows.length-1-i)},${y(r[3])}`)).join(' ');
$('intervalChart').innerHTML=`<p class="scope-label">FIXED · May–Jun · band calibrated before May 1 · no filters</p><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="May–June forecast interval band and actual daily wagers; full numeric table follows"><polygon points="${band}" fill="var(--brass)" opacity=".22"/><path d="${path(1)}" fill="none" stroke="var(--s1)" stroke-width="2"/><path d="${path(4)}" fill="none" stroke="var(--ink)" stroke-width="2"/>${[0,.5,1].map(f=>`<text x="0" y="${y(f*max)}">${(f*max/1e6).toFixed(1)}M</text>`).join('')}<text x="${pad}" y="250">May 1</text><text x="${W-90}" y="250">Jun 30</text></svg><p class="small">Gold band: nominal 90% interval · teal: forecast · light: actual. Bounds are available in the expandable table.</p>`;
}

const S=A.scenarios,C=A.accounting;
$('decisionLab').innerHTML='<h3>What survives after costs and customer switching?</h3><p class="scope-label">FIXED JULY DECISION · scenarios are assumptions, not model forecasts · no global filters</p>'+
 '<p class="study-note"><b>Fund one inspection; hold the other options.</b> The narrow plan stays within budget without treating zone-level gains as new casino revenue. A $1,500 repair allowance in base/upside scenarios is conditional and comes from reserve, not an authorized catalog purchase.</p>'+
 table(['Recommended inspection-only plan','Recovery assumption','Inspection cost','Conditional repair','Lost theo during inspection','Net July contribution'],S.recommended.map(r=>[r.name,money(r.inspectionRecovery),money(r.actionCost),money(r.conditionalRepair),money(r.downtimeCost),`<b>${money(r.netContribution)}</b>`]))+
 '<details><summary>Why the earlier $12,700 package is not funded</summary>'+table(['Scenario','Zone lift','Retained elsewhere','Property signage gain','New variable costs','Inspection recovery','Conditional repair','Fixed actions','Net July contribution'],S.rows.map(r=>[r.name,pct(r.zoneLift),pct(r.substitution),money(r.signageProperty),money(r.variableCost),money(r.inspectionRecovery),money(r.conditionalRepair),money(r.actionCost),money(r.netContribution)]))+
 `<p class="study-note">Also subtract ${money(S.rows[0].inspectionDowntimeCost)} inspection downtime in every scenario. Pilot July benefit is zero. Signage starts Jul 11 (20 days), pilot Jul 6 (25 days), inspection eligible Jul 2. Base package needs about ${pct(S.baseBreakevenLift)} zone lift to break even under its other assumptions. Repair delay would reduce recovery further. These are not probability-weighted expected returns.</p></details>`+
 '<h3 style="margin-top:20px">Stress-test the deferred package</h3><div class="lab-controls"><label>Back Forty lift <output id="liftValue"></output><input id="lift" type="range" min="0" max="15" step=".5" value="2"></label><label>Play shifted from other zones <output id="cannValue"></output><input id="cann" type="range" min="0" max="100" step="5" value="50"></label></div><p class="answer" id="scenarioResult"></p>'+
 `<details><summary>Property-wide contribution identity and measurement</summary><p class="study-note">Historical Jan–Jun contribution after supplied costs: <b>${money(C.contribution)}</b> = house win ${money(C.hw)} + POS cash ${money(C.cash)} − POS COGS ${money(C.cogs)} − supplied machine costs ${money(C.machines)} − technician labor ${money(C.labor)}. Comp cost is already in COGS; do not subtract it twice. Replacing house win with theo yields ${money(C.expectedContribution)} expected contribution before luck. This is not accounting net profit: unsupplied fixed costs are excluded.</p><p class="study-note">If signage is later funded, report Back Forty theo/h alongside total-property expected contribution, realized contribution and control-zone displacement for Jul 11–30. Use daily weekday-adjusted June baselines and a frozen prelaunch analysis; account for events and all action/operating costs. Positive zone lift with unchanged floor contribution is redistribution. Without a randomized property-level control or replicated intervention, a property before/after change remains descriptive. Do not treat the known failed pretrend as solved by relabeling the comparison.</p><p class="study-note">What-if formula: monthly Back Forty theo × 20/30 × lift × (1 − switching) × (1 − 10% new variable-cost allowance) + $3,000 inspection recovery − $12,700 actions − $1,500 conditional repair − inspection downtime. The 10% allowance is a stress assumption, not a measured marginal cost rate.</p></details>`;
function scenario(){const lift=+$('lift').value/100,cann=+$('cann').value/100;$('liftValue').textContent=pct(lift);$('cannValue').textContent=pct(cann);
const net=S.backFortyMonthlyTheo*20/30*lift*(1-cann)*.9+3000-12700-1500-S.rows[0].inspectionDowntimeCost;
$('scenarioResult').textContent=`Deferred three-action package: ${money(net)} July incremental contribution under these assumptions. ${net<0?'Does not break even.':'Clears assumed costs, but the lift still needs evidence.'}`;}
$('lift').oninput=scenario;$('cann').oninput=scenario;scenario();

const T=A.pilot;
$('pilotDetails').innerHTML='<p class="scope-label">DEFERRED OPTION · A-COMP-PILOT · $4,000 setup · 5-day lead · not funded in the $1,200 recommendation</p>'+
 `<p class="study-note"><b>Sample:</b> ${num(T.totalEnrolled)} players, ${num(T.perArm)} per arm, from ${num(T.eligiblePlayers)} June-active card holders. Randomly omit one to balance arms. Apply eligibility/safety exclusions before randomization and recalculate power if the pool shrinks. Randomize 1:1 within June ending-tier × home-region strata, with reproducible assignment and sealed allocation. No selection by losses. If approved July 1, enroll before July 6 and measure Jul 6–30; otherwise shift dates and recalculate the horizon.</p>`+
 `<p class="study-note"><b>Primary endpoint:</b> 25-day expected tracked contribution per assigned player = theo + linked POS cash − linked POS COGS. Include every assigned player; non-returners have zero. Compare 12.5 points/$ versus current-policy control on newly earned points only, preserving the value of prior balances. No bonus awards or incentives to gamble more. Analyze by assigned arm; record actual exposure/compliance separately.</p>`+
 table(['Planning quantity','Value'],[
 ['Historical cohort',`${num(T.planningCohort)} May-active players, June outcomes, zeros for non-returners (${pct(T.nonReturnShare)})`],
 ['25-day mean / SD proxy',`${money(T.mean25DayContribution)} / ${money(T.sd25DayContribution)}`],
 ['80% power, two-sided α = .05 MDE',`$${T.mde80.toFixed(2)} per assigned player`],
 ['$5 target: required / planned per arm',`${num(T.requiredPerArmForTarget)} / ${num(T.perArm)}`],
 ['If outcome SD is 25% larger',`MDE $${T.mdeWith25PctMoreSD.toFixed(2)}; need ${num(T.requiredPerArmWith25PctMoreSD)} per arm for $5`],
 ['Comp-cost secondary MDE',`$${T.mdeCompCost.toFixed(2)} per player; diagnostic, not a second primary success test`]])+
 '<p class="study-note"><b>Power assumptions:</b> two independent arms; n/arm = 2 × (1.96 + 0.842)² × SD² / δ². Historical monthly mean and SD are scaled by 25/30 as a planning proxy, not an empirically observed 25-day distribution. Heavy tails, eligibility exclusions, weak policy exposure and change in return rates can reduce power. Do not promise detection of small savings or assume statistical significance.</p>'+
 '<p class="study-note"><b>Success:</b> freeze the protocol before launch. At Jul 30 only, estimate the difference in means with a player-level stratified bootstrap 95% interval. Call the treatment promising only if the lower bound exceeds $0 and the point estimate is at least $5 per assigned player. Also require the lower 97.5% bound on the return-rate difference to exceed −2 percentage points and no unresolved harm/complaint trigger. Otherwise do not roll out; an inconclusive result is not evidence of no effect. Use realized contribution, comp cost and visits as secondary diagnostics. Report full distributions and missing POS linkage.</p>'+
 '<p class="study-note"><b>Stopping:</b> no early efficacy stopping or repeated significance testing. Check data integrity and safety on Jul 10, 15, 20, 25 and 30. Pause exposure immediately for any confirmed policy-related financial-harm incident, altered legacy balance, allocation failure, or three substantiated policy-related complaints. Investigate before any restart; report stopped trials as stopped. Budget is $4,000 setup; forecast no July benefit and no extra awards. Added training, awards or compensation require a revised cost envelope before approval.</p>'+
 '<p class="study-note"><b>Property guardrail:</b> roll up both randomized arms once, without counting comp costs twice; compare all-play expected and realized contribution after supplied costs and pilot setup. Do not extrapolate a carded-player effect to uncarded play. A non-returning guest is an outcome, not a reason to remove them. The pilot is deferred under the July-only budget; its information value may justify approval under an explicitly longer horizon.</p>';
})();

