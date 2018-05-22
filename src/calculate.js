//WIP!!!!!

function createBasicSummarizer(prop) {
    return (features) => {
        let valid_features = features.filter((f) => isNumeric(f.properties[prop]));

        let sum = valid_features.reduce((total, f) => {
            return total + f.properties[prop];
        }, 0);

        return sum / features.length;
    };
}

const PROPERTY_CONFIG = [
    {
        name: "Vehicle Miles Traveled",
        dom_name: "vmt",
        summarizer: createBasicSummarizer('hh_type1_vmt')
    }, 
    {
        name: "Pedestrian Collisions",
        dom_name: "pedcol",
        summarizer: (features) => {
            features = features.filter(nulls);

            let sums = features.reduce((totals, f) => {
                let props = f.properties;

                totals['SumAllPed'] += (totals['SumAllPed'] || 0) + props['SumAllPed'];
                totals['JTW_WALK'] += (totals['JTW_WALK'] || 0) + props['JTW_WALK'];
                totals['JTW_TOTAL'] += (totals['JTW_TOTAL'] || 0) + props['JTW_TOTAL'];
                totals['TOTPOP1'] += (totals['TOTPOP1'] || 0) + props['TOTPOP1'];

                return totals;
            }, {});

            return 100000 * (sums['SumAllPed'] / sums['TOTPOP1']) / (sums['JTW_WALK'] / sums['JTW_TOTAL']) / 365.25;
        }
    }
];


        


const PROPERTIES = [
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

const isNumericable = (val) => !isNaN(parseFloat(n));
const isNumeric = (val) => !isNaN(val) && isFinite(val);

const addCommas = (val) => val.toLocaleString();

const calculatePct = (val, { min, max }) => 100 * ((val - min) / (max - min));
const formatPctStr = (pct) => `${pct}%`;

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

function clearReadouts() {

    PROP_NAMES.forEach((prop) => {
        let $stat = document.querySelector(`#stat-${prop}`);
        let $bar = document.querySelector(`#bar-${prop} > .bar`);

        $bar.className = 'bar na';
        $stat.innerHTML = 'N/A';
    });
}

function populateReadouts(metrics, ranges) {

    PROP_NAMES.forEach((prop) => {
        let $stat = document.querySelector(`#stat-${prop}`);
        let $bar = document.querySelector(`#bar-${prop} > .bar`);
        let val = metrics[prop];
        let pct = calculatePct(val, ranges[prop]);

        if (isNumeric(pct)) {
            $bar.style.width = formatPctStr(pct);
            $stat.innerHTML = addCommas(precision(val, 1));
            $bar.className = 'bar ' + getTypologyFromPct(pct);
        } else {
            $bar.className = 'bar na';
        }
        
    });

}

function summarizeMetrics(features) {
    // accumulate => reduce

    function accumulateMetrics(result, prop) {
        // need this to return the summarized metrics that are used to 

        props.forEach(({ reducer, accumulator, prop }) => {
            let sums = features.map(mapper);
            let score = reducer(sums); 
            result[prop] = accumulator(f);
        });
    }

    let accumulated = PROPS.reduce(accumulateMetrics, {});


}

