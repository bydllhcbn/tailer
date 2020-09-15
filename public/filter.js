filterQuery.onclick = showAutocomplete;
//filterQuery.onblur = hideAutocomplete;
var filterDropdownMenu = find('#filter-dropdown-menu');
filterDropdownMenu.onmouseleave = hideAutocomplete;
document.onclick = function (event) {
    console.log(event.target);
}
function showAutocomplete() {
    filterDropdownMenu.style.display = '';
}
function hideAutocomplete() {
    filterDropdownMenu.style.display = 'none';
}
function filterAutocomplete() {
    // Create the no matches entry if it does not exists yet
    if (!filterDropdownMenu.data("containsNoMatchesEntry")) {
        $("input.autocomplete + ul.dropdown-menu").append('<li class="no-matches hidden"><a>No matches</a></li>');
        filterDropdownMenu.data("containsNoMatchesEntry", true);
    }

    // Show only matching values
    filterDropdownMenu.find("li:not(.no-matches)").each(function (key, li) {
        var $li = $(li);
        $li[new RegExp(this.value, "i").exec($li.text()) ? "removeClass" : "addClass"]("hidden");
    });

    // Show a specific entry if we have no matches
    filterDropdownMenu.find("li.no-matches")[filterDropdownMenu.find("li:not(.no-matches):not(.hidden)").length > 0 ? "addClass" : "removeClass"]("hidden");
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
    }, 250);
}


function onFilterListItemClicked(item) {
    filterQuery.value = item.getAttribute('data-item')
    onFilterChanged(filterQuery.value)
}
