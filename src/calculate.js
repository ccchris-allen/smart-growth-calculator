//WIP!!!

export function pedcol(feature) {
    let total_collisions = sums['SumAllPed'];
    let walk_pct = sums['JTW_WALK'] / sums['JTW_TOTAL'];

    let ped_per_100k = 100000 * (total_collisions / sums.pop_ped);
    let ped_per_100k_walk = ped_per_100k / walk_pct;
    let ped_per_100k_walk_daily = ped_per_100k_walk / 365.0;
}

