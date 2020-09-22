//filterQuery.onblur = hideAutocomplete;
var filterDropdownMenu = find('#filter-dropdown-menu');
var buttonToggle = find('#button-toggle');


function toggleFilterDropdown() {
    if (filterDropdownMenu.style.display === '') {
        filterDropdownMenu.style.display = 'none';
    } else {
        filterDropdownMenu.style.display = '';
    }
}


let filterInputTimeout = '';


function onFilterChanged(query) {
    clearTimeout(filterInputTimeout);
    filterInputTimeout = setTimeout(function () {
        let queryL = query.toLowerCase();
        for (let i = 0; i < logArray.length; i++) {
            if (logArray[i].query.indexOf(queryL) !== -1) {
                logArray[i].element.style.display = '';
            } else {
                logArray[i].element.style.display = 'none';
            }
        }
        logList.scrollTop = logList.scrollHeight;
    }, 250);
}


function onFilterListItemClicked(item) {
    filterQuery.value = item.getAttribute('data-item')
    onFilterChanged(filterQuery.value)
    toggleFilterDropdown();
}

function clearFilterQueryInput() {
    filterQuery.value = '';
    onFilterChanged('')
}