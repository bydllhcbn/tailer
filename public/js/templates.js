function htmlToElement(html) {
    var template = document.createElement('template');
    html = html.trim();
    template.innerHTML = html;
    return template.content.firstChild;
}

let templateServerRow = (name, host, status) => htmlToElement(`
    <div style="padding: 6px" href="javascript:void(0)"
            class="list-group-item server-item">
            <div class="row">
            <div class="col-md-6">
             <h6>${name} - ${host}</h6>
</div><div class="col-md-6">
              <div class=" btn-group">
       <button class="btn btn-sm btn-outline-danger"  data-name="${name}" data-host="${host}"  onclick="openDeleteServerModal('${name}')">remove</button>
       <button class="btn btn-sm btn-outline-primary" data-name="${name}" data-host="${host}"  onclick="openSSHTerminal('${name}')">ssh client</button>
       <button class="btn btn-sm btn-outline-success" data-name="${name}" data-host="${host}"  onclick="onServerItemClicked(this)">tail logs</button>
</div>
</div>
</div>
       
     
    </div>
    `);

let templateFileRow = file => htmlToElement(`
    <label class="list-group-item list-group-item-action form-check-label d-flex justify-content-between" for="${file.name}">
        <span><b>${file.name}</b> - ${file.size} - <small>last modified ${timeSince(new Date(file.date))} ago</small></span>
        <input style="display: none" onchange="onFileCheckChange(this)" class="form-check-input file-row-input" type="checkbox" id="${file.name}">
    </label>
    `)

let ipListItem = (item,data) => htmlToElement(`
    <li class="list-group-item list-group-item-action" onclick="onFilterListItemClicked(this)" data-item="${data}">${item}</li>
    `)

let templateLogRow = log => {
    let template = document.createElement('li');
    template.classList.add('log-item')
    template.innerHTML = log;
    return template;
}