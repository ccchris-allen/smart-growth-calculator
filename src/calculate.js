var chroma = require('chroma-js');

const isNumericable = (val) => !isNaN(parseFloat(n));
const isNumeric = (val) => !isNaN(val) && isFinite(val);
const formatNumber = (val, precision) => val.toLocaleString(undefined, {maximumFractionDigits: precision});
const calculatePct = (val, { min, max }) => 100 * ((val - min) / (max - min));
const formatPctStr = (pct) => `${Math.floor(pct)}%`;
const forceArray = (a) => Array.isArray(a) ? a : [a];

function getTypologyFromPct(pct) {
    // very simple way of defining bins 
    // should do jenks (?)

    if (pct < 33) {
        return 'integrated';
    } else if (pct < 66) {
        return 'transitioning';
    } else {
        return 'emerging';
    }
}

function getColor(value, values, scale=['SeaGreen', 'Gold', 'Crimson'], mode='q', steps=9) {
    // this is sloppy, rewrite later...

    values = values.filter((v) => (!isNaN(v) && v !== undefined && v !== Infinity));

    let limits = chroma.limits(values, mode, steps - 1);
    let colors = chroma.scale(scale).colors(limits.length);

    for (var i = 0; i < limits.length; i++) { 
        if (featureValue <= limits[i]) {
            return colors[i];
            break;
        }
    }
    return null;
}

function clearReadout(prop) {
    let $stat = document.querySelector(`#stat-${prop}`);
    let $bar = document.querySelector(`#bar-${prop} > .bar`);

    $bar.className = 'bar na';
    $stat.innerHTML = 'N/A';
}

export function clearReadouts() {
    PROPERTY_ORDER.forEach(clearReadout);
}

export function populateReadouts(features, verbose=false) {

    PROPERTY_ORDER.forEach((prop) => {
        let info = property_config[prop];
        let $stat = document.querySelector(`#stat-${prop}`);
        let $bar = document.querySelector(`#bar-${prop} > .bar`);
        let val = info.summarizer(features);

        if (isNumeric(val)) {
            let {avg} = info.range;

            let pct = calculatePct(val, info.range);
            //pct = info.invert ? (100 - pct) : pct;

            let pctDiff = Math.floor((val - avg) / ((val + avg) / 2.0) * 100);
            let pctDiffStr = (pctDiff > 0) ? '+%' + pctDiff : '-%' + Math.abs(pctDiff);

            $bar.style.width = formatPctStr(pct);

            $stat.innerHTML = `${formatNumber(val, info.precision)} (${pctDiffStr})`;
            if (info.invert) {
                $bar.className = `bar no-typology`;
            } else {
                $bar.className = `bar ${getTypologyFromPct(info.invert ? 100 - pct: pct)}`;
            }
        } else {
            clearReadout(prop);
        }
    });
}

function createSimpleSummarizer(prop) {
    return (features) => {
        features = Array.isArray(features) ? features : [features];

        let valid_features = features.filter((f) => isNumeric(f.properties[prop]));

        if (valid_features.length == 0) {
            return undefined;
        }

        let sum = valid_features.reduce((total, f) => {
            return total + f.properties[prop];
        }, 0);

        return sum / features.length;
    };
}

export const PROPERTY_ORDER = [
    "vmt",
    "housing",
    "afford-transport",
    "afford-house-transport",
    "ghg",
    "pop-density",
    "jobs-density",
    "dwelling-density",
    "ped-environment",
    "pedcol",
    "walkscore",
    "walkshare",
    "jobs-accessibility",
    "cardio",
    "obesity"
];

export let property_config = {
    "vmt": {
        name: "Vehicle Miles Traveled",
        dom_name: "vmt",
        precision: 0,
        attribute: "hh_type1_vmt",
        summarizer: createSimpleSummarizer("hh_type1_vmt")
    }, 
    "housing": {
        name: "Housing Affordability",
        dom_name: "housing",
        precision: 1,
        attribute: "hh_type1_h",
        summarizer: createSimpleSummarizer("hh_type1_h")
    }, 
    "afford-transport": {
        name: "Transportation Affordability",
        dom_name: "afford-transport",
        precision: 1,
        attribute: "hh_type1_t",
        summarizer: createSimpleSummarizer("hh_type1_t")
    }, 
    "afford-house-transport": {
        name: "Housing + Transportation Affordability",
        dom_name: "afford-house-transport",
        precision: 1,
        attribute: "hh_type1_ht",
        summarizer: createSimpleSummarizer("hh_type1_ht")
    }, 
    "pop-density": {
        name: "Population Density",
        dom_name: "pop-density",
        precision: 1,
        attribute: "D1B",
        invert: true,  // some metrics need to be inverted, to conform with high = bad
        summarizer: createSimpleSummarizer("D1B")
    }, 
    "dwelling-density": {
        name: "Dwelling Density",
        dom_name: "dwelling-density",
        precision: 1,
        attribute: "D1A",
        invert: true,  // some metrics need to be inverted, to conform with high = bad
        summarizer: createSimpleSummarizer("D1A")
    }, 
    "jobs-density": {
        name: "Jobs Density",
        dom_name: "jobs-density",
        precision: 1,
        attribute: "D1C",
        invert: true,  // some metrics need to be inverted, to conform with high = bad
        summarizer: createSimpleSummarizer("D1C")
    }, 
    "ped-environment": {
        name: "Pedestrian Environment",
        dom_name: "ped-environment",
        precision: 1,
        attribute: "D1b",
        invert: true,
        summarizer: createSimpleSummarizer("D3b")
    }, 
    "jobs-accessibility": {
        name: "Jobs Accessibility",
        dom_name: "jobs-accessibility",
        precision: 0,
        attribute: "D5br_cleaned",
        invert: true,  // some metrics need to be inverted, to conform with high = bad
        summarizer: createSimpleSummarizer("D5br_cleaned")
    }, 
    "walkscore": {
        name: "WalkScore",
        dom_name: "walkscore",
        precision: 1,
        attribute: "walkscore",
        invert: true,  // some metrics need to be inverted, to conform with high = bad
        summarizer: createSimpleSummarizer("walkscore")
    }, 
    "cardio": {
        name: "Cardiovascular Disease",
        dom_name: "cardio",
        precision: 1,
        attribute: "Cardiova_1",
        summarizer: createSimpleSummarizer("Cardiova_1")
    }, 
    "obesity": {
        name: "Obesity",
        dom_name: "obesity",
        precision: 1,
        attribute: "OBESITY_Cr",
        summarizer: createSimpleSummarizer("OBESITY_Cr")
    }, 
    "walkshare": {
        name: "Walking Percent",
        dom_name: "walkshare",
        precision: 1,
        invert: true,  // some metrics need to be inverted, to conform with high = bad
        summarizer: (features) => {
            features = forceArray(features);

            let valid_features = features.filter((f) => { 
                let props = ['JTW_WALK', 'JTW_TOTAL'];

                for (let i = 0; i < props.length; i++) {
                    if (!isNumeric(f.properties[props[i]])) {
                        return false;
                    }
                }

                return true;
            });

            if (valid_features.length == 0) {
                return undefined;
            }

            let sums = valid_features.reduce((totals, f) => {
                let props = f.properties;

                totals['JTW_WALK'] += parseFloat(props['JTW_WALK']);
                totals['JTW_TOTAL'] += parseFloat(props['JTW_TOTAL']);

                return totals;
            }, { 'JTW_WALK': 0, 'JTW_TOTAL': 0 });

            return 100 * sums['JTW_WALK'] / sums['JTW_TOTAL'];
        }
    }, 
    "ghg": {
        name: "Carbon Emissions",
        dom_name: "ghg",
        precision: 0,
        summarizer: (features) => {
            features = forceArray(features);

            let valid_features = features.filter((f) => isNumeric(f.properties["hh_type1_vmt"]));

            if (valid_features.length == 0) {
                return undefined;
            }

            let sum = valid_features.reduce((total, f) => {
                return total + f.properties["hh_type1_vmt"] * .90
            }, 0);

            return sum / features.length;
        }
    }, 
    "pedcol": {
        name: "Pedestrian Collisions",
        dom_name: "pedcol",
        precision: 1,
        summarizer: (features) => {
            features = forceArray(features); 

            let valid_features = features.filter((f) => { 
                let props = ['SumAllPed', 'JTW_WALK', 'JTW_TOTAL', 'TOTPOP1'];

                for (let i = 0; i < props.length; i++) {
                    if (!isNumeric(f.properties[props[i]])) {
                        return false;
                    }
                }

                return true;
            });

            if (valid_features.length == 0) {
                return undefined;
            }

            let sums = valid_features.reduce((totals, f) => {
                let props = f.properties;

                totals['SumAllPed'] += parseInt(props['SumAllPed']);
                totals['JTW_WALK'] += parseInt(props['JTW_WALK']);
                totals['JTW_TOTAL'] += parseInt(props['JTW_TOTAL']);
                totals['TOTPOP1'] += parseInt(props['TOTPOP1']);

                return totals;
            }, { 'SumAllPed': 0, 'JTW_WALK': 0, 'JTW_TOTAL': 0, 'TOTPOP1': 0 });

            return 100000 * (sums['SumAllPed'] / sums['TOTPOP1']) / (sums['JTW_WALK'] / sums['JTW_TOTAL']) / 365.25;
        }
    }
};


        



