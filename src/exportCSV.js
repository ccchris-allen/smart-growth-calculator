/*
 * Simple module for generating CSV-formatted strings from arrays of objects.
 * Code was adapted from:
 * https://medium.com/@danny.pule/export-json-to-csv-file-using-javascript-a0b7bc5b00d2
 */

const LINE_BREAK = '\r\n';
const DELIMITER = ',';

function CSVify(rows, headers=null) {
    // assuming all objects have same properties here
    headers = headers || Object.keys(rows[0]);

    let headers_csv = headers.join(DELIMITER);
    let rows_csv = rows.map((row) => {
        return headers.map((h) => row[h]).join(DELIMITER);
    }).join(LINE_BREAK);

    return [headers_csv, rows_csv].join(LINE_BREAK);
}

export function exportCSVFile(items, headers=null, filename="export.csv") {
    var csv = CSVify(items, headers);
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

    if (navigator.msSaveBlob) { // IE 10+
        navigator.msSaveBlob(blob, filename);
    } else {
        var link = document.createElement("a");
        if (link.download !== undefined) { // feature detection
            // Browsers that support HTML5 download attribute
            var url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
}
