//WIP!!!

function isNumericable(val) {
    return !isNaN(parseFloat(n));
}

function isNumeric(val) {
    return !isNaN(val) && isFinite(val);
}

function addCommas(val) {
    return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function calculatePct(val, { min, max }) {
    return 100 * ((val - min) / (max - min));
}

function formatPctStr(pct) {
    return `${pct}%`;
}

function getTypologyFromPct(pct) {
    // very simple way of defining bins 

    if (pct < 33) {
        return 'integrated';
    } else if (pct < 66) {
        return 'transitioning';
    } else {
        return 'emerging';
    }
}

function populateReadouts(metrics, ranges) {

    let props = [
        'vmt',
        'ghg',
        'dwelling-density',
        'population-density',
        'jobs-density'
        'pedcol',
        'walkscore',
        'cbgs',
        'housing',
        'ped-environment',
        'jobs-accessibility'
    ];

    props.forEach((prop) => {
        let $stat = document.querySelector(`#stat-${prop}`);
        let $bar = document.querySelector(`#bar-${prop} > .bar`);
        let val = metrics[prop];
        let pct = calculatePct(val, ranges[prop]);

        if (isNumeric(pct)) {
            $bar.style.width = formatPctStr(pct);
            $bar.className = 'bar ' + getTypologyFromPct(pct);
        } else {
            $bar.className = 'bar na';
        }
        
        $stat.innerHTML = (val >= 1000) ? addCommas(val) : val;
    });

}

function summarizeMetrics(features) {
    // accumulate, then reduce
    
    let accumulators = {

}

