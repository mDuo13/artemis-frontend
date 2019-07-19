let base_url = "$artemis-pointers.dev"
let logged_in = false
let api_token = ""
const api_base = "https://artemis-pointers.dev/v1" // TODO

let auth0

async function on_ready() {
    
    auth0 = await createAuth0Client({
      domain: 'artemis-test.auth0.com',
      client_id: 'vJ8RBWXpUUYcE6YIs116m5T6sHS2Auwi'
    })
    
    console.debug("Got Auth0 client")

    handle_hashchange()
    
    $( window ).on( 'hashchange', handle_hashchange )
}

function handle_hashchange(evt) {
    if (logged_in) {
        const path_match = (/^#(create|list|edit|show|delete|logout)\/?(.*)$/).exec(window.location.hash)
        if (path_match === null) list_pointers()
        else if (path_match[1] == "create") create_pointer()
        else if (path_match[1] == "list") list_pointers()
        else if (path_match[1] == "edit" && path_match[2]) edit_pointer(path_match[2])
        else if (path_match[1] == "show" && path_match[2]) show_pointer(path_match[2])
        else if (path_match[1] == "delete" && path_match[2]) delete_pointer(path_match[2])
        else if (path_match[1] == "logout") do_logout()
        else list_pointers()
    } else {
        if (window.location.hash === "#login") {
            try_login()
        } else if (window.location.hash === "#logincallback") {
            login_callback()
        }
    }
}

async function try_login() {
    await auth0.loginWithRedirect({
        redirect_uri: "https://artemis.mduo13.com/#logincallback"
    })
}

async function login_callback() {
    console.log("in login_callback()")
    try {
        result = await auth0.handleRedirectCallback()
        console.log("handleRedirectCallback result:", result)
    } catch(e) {
        console.error(e)
    }
    // redirect handled
    try {
        api_token = await auth0.getTokenSilently()
    } catch(e) {
        console.error(e)
        errorNotif("Login failed")
        logged_in = false
        return
    }
    
    logged_in = true
    successNotif("Logged in!")
    $(".logout").show()
    $(".login").hide()
    
    try{
        const user = await auth0.getUser()
        $('<span><img alt="user picture" src="'+user.picture+'" height="40" width="40" /> '+user.name+'</span>').appendTo($("#userinfo"))
    } catch(e) {
        console.error(e)
    }
    
    
    window.location.hash="#list"
    return
}

async function do_logout() {
    auth0.logout()
}

async function list_pointers() {
    $("a").removeClass("active")
    $(".edit").prop("href", "#edit").addClass("not-real-link")
    $(".show").prop("href", "#show").addClass("not-real-link")
    $(".delete").prop("href", "#delete").addClass("not-real-link")
    $(".list").addClass("active")
    
    $("section").hide()
    
    data = await get_pointers()
    const pointerlist = $(".pointerlist")
    pointerlist.empty().show()
    
    data.pointers.forEach((ptr) => {
        const card = $('<div class="card pointer"><h3 class="card-header">'+ base_url +'/'+ptr.in+'</h3>' +
            '<div class="card-body"><p class="card-text pointer-type">' + 
            '<strong>Type:</strong> ' + pretty_type(ptr) + '</p>' +
            '<p class="card-text pointer-dest">' +
            '<strong>To:</strong> <span class="'+ ptr.type + '">' + ptr.to + '</span>' +
            '</p>' +
            '<a href="#show/'+ptr.in+'" class="btn btn-success show">View status</a>' +
            '<a href="#edit/'+ptr.in+'" class="btn btn-secondary edit">Edit</a>' +
            '<a href="#delete/'+ptr.in+'" class="btn btn-danger delete">Delete</a>' +
            '</div>' +
            '</div>').appendTo(pointerlist)
    })
    $('<a class="create btn btn-success" href="#create">Create New Pointer</a>').appendTo(pointerlist).click(create_pointer)
}

async function show_pointer(ptr_in) {
    $("a").removeClass("active")
    $(".show").addClass("active")
    
    $("section").hide()
    
    const pointer_status = $(".pointer_status")
    pointer_status.empty().show()
    
    const ptr = await get_status(ptr_in)
    
    let scaled_balance
    if (ptr.balance === undefined) {
        scaled_balance = "0"
    } else {
        scaled_balance = intscale_to_decimal(ptr.balance, ptr.asset_scale)
    }
    
    let scaled_thresh
    if (ptr.threshold === undefined) {
        scaled_thresh = "0"
    } else {
        scaled_thresh = intscale_to_decimal(ptr.threshold, ptr.asset_scale)
    }
    
    $('<div class="card"><h3 class="card-header">'+base_url+'/'+ptr.in+'</h3>' +
        '<div class="card-body">' +
        '<p class="card-text pointer-type">' + 
        '<strong>Type:</strong> ' + pretty_type(ptr) + '</p>' +
        '<p class="card-text pointer-dest">' +
        '<strong>To:</strong> <span class="'+ ptr.type + '">' + ptr.to + '</span>' +
        '</p>' +
        '<p><strong>Incoming Pointer:</strong> '+ptr.in+'</p>' +
        '<p><strong>Balance:</strong> '+scaled_balance+' '+ptr.asset_code+'</p>' +
        '<p><strong>Threshold:</strong> '+scaled_thresh+'</p>' +
        '<label>Web Monetization Meta Tag:</label>' +
        '<pre><code id="monetization_sample">&lt;meta name="monetization"\n  content="'+base_url+'/'+ptr.in+'"&gt;</code></pre>' +
        '<a href="#edit/'+ptr.in+'" class="btn btn-secondary edit">Edit</a>' +
        '<a href="#delete/'+ptr.in+'" class="btn btn-danger delete">Delete</a>' +
        '</div></div>').appendTo(pointer_status)
    
    $("#left-nav .edit").prop("href", "#edit/"+ptr.in).removeClass("not-real-link")
    $("#left-nav .show").prop("href", "#show/"+ptr.in).removeClass("not-real-link")
    $("#left-nav .delete").prop("href", "#delete/"+ptr.in).removeClass("not-real-link")
    
}

async function create_pointer(evt) {
    $("a").removeClass("active")
    $(".edit").prop("href", "#edit").addClass("not-real-link")
    $(".show").prop("href", "#show").addClass("not-real-link")
    $(".delete").prop("href", "#delete").addClass("not-real-link")
    $(".create").addClass("active")
    
    pointer_edit_ui({
        "in": "",
        "type": "NONE"
    })
}

async function edit_pointer(ptr_in) {
    $("a").removeClass("active")
    $(".edit").addClass("active")
    const ptr_status = await get_status(ptr_in)
    $("#left-nav .edit").prop("href", "#edit/"+ptr_in).removeClass("not-real-link")
    $("#left-nav .show").prop("href", "#show/"+ptr_in).removeClass("not-real-link")
    $("#left-nav .delete").prop("href", "#delete/"+ptr_in).removeClass("not-real-link")
    pointer_edit_ui(ptr_status)
}

async function pointer_edit_ui(ptr) {
    $("section").hide()
    const editbox = $(".pointer_editor")
    editbox.empty().show()
    
    let scaled_threshold
    if (ptr.hasOwnProperty("threshold")) {
        display_threshold = intscale_to_decimal(ptr.threshold, ptr.asset_scale)
    } else {
        display_threshold = ""
    }
    
    $('<div class="card"><h3 class="card-header">Pointer Settings</h3>' +
        '<div class="card-body"><form>'+
        '<input type="hidden" id="old_in" value="'+ptr.in+'" />' +
        '<label for="pointer_in"><strong>Incoming Pointer:</strong></label>' +
        '<div class="form-group row">' +
        '<label for="pointer_in" class="col-sm-3">'+base_url+'/'+'</label>' +
        '<input type="text" class="form-control col-sm-9" value="'+ptr.in+'" id="pointer_in" />' +
        '</div>' +
        '<div class="form-group row">' +
        '<label for="pointer_type_select" class="col-sm-3"><strong>Pointer Type:</strong></label> ' +
        '<select class="form-control col-sm-9" id="pointer_type_select">'+
          '<option value="PAYMENT_POINTER"'+(ptr.type=="PAYMENT_POINTER"?" selected":"")+'>Payment Pointer</option>' +
          '<option value="SPSP_URL"'+(ptr.type=="SPSP_URL"?" selected":"")+'>SPSP URL</option>' +
          '<option value="XRPL_ADDRESS"'+(ptr.type=="XRPL_ADDRESS"?" selected":"")+'>XRP Ledger Address</option>' +
          '<option value="NONE"'+(ptr.type=="NONE"?" selected":"")+'>Receive Only</option>' +
        '</select>' +
        '</div>' +
        '<div class="form-group row">' +
        '<label for="currency_select" class="col-sm-3" id="currency_select_label"><strong>Currency/Asset:</strong></label> ' +
        '<select class="form-control col-sm-9 hide" id="currency_select">'+
          '<option value="USD"'+(ptr.asset_code=="USD"?" selected":"")+'>United States Dollar (USD)</option>' +
          '<option value="XRP"'+(ptr.asset_code=="XRP"?" selected":"")+'>XRP</option>' +
          '<option value="HAK"'+(ptr.asset_code=="HAK"?" selected":"")+'>Hackathon Points (HAK)</option>' +
        '</select>' +
        '</div>' +
        '<div class="form-group row">' +
        '<label for="to_address" class="col-sm-3"><strong>Deliver To:</strong></label>' +
        '<input type="text" class="form-control col-sm-9" value="'+(ptr.to === undefined?"":ptr.to)+'" id="to_address" />' +
        '</div>' +
        '<div class="form-group row">' +
        '<label for="threshold" class="col-sm-3"><strong>Payout Threshold:</strong></label>' +
        '<input type="text" class="form-control col-sm-9" value="" id="threshold" placeholder="(Leave blank for default)" />' +
        '</div>' +
        '</div></form></div></div>').appendTo(editbox)
    $("#pointer_type_select").change(select_type)
    $('<a class="save btn btn-success" href="#save">Save Pointer</a>').appendTo(editbox).click(handle_save)
    
}

function select_type(event) {
    const selected_type = $("#pointer_type_select").val()
    switch (selected_type) {
    case "NONE":
        $("#threshold").prop("disabled", true)
        $("#to_address").prop("placeholder", "")
        $("#to_address").prop("disabled", true)
        $("#currency_select").prop("disabled", true)
        break
    case "XRPL_ADDRESS":
        $("#threshold").prop("disabled", false)
        $("#threshold").val("0.001000")
        $("#currency_select").val("XRP")
        $("#currency_select").prop("disabled", true)
        $("#to_address").prop("disabled", false)
        $("#to_address").prop("placeholder", "XRP Ledger address")
        break
    case "PAYMENT_POINTER":
        $("#threshold").prop("disabled", false)
        $("#currency_select").prop("disabled", false)
        $("#to_address").prop("disabled", false)
        $("#to_address").prop("placeholder", "Payment pointer")
        break
    case "SPSP_ADDRESS":
        $("#threshold").prop("disabled", false)
        $("#currency_select").prop("disabled", false)
        $("#to_address").prop("disabled", false)
        $("#to_address").prop("placeholder", "SPSP URL")
        break
    default:
        $("#threshold").prop("disabled", false)
        $("#to_address").prop("disabled", false)
        $("#currency_select").prop("disabled", false)
    }
}

function pretty_type(ptr) {
    switch(ptr.type) {
        case "XRPL_ADDRESS":
            return "XRP Ledger Address"
        case "PAYMENT_POINTER":
            return "Payment Pointer"
        case "SPSP_URL":
            return "SPSP URL"
        case "NONE":
            return "Receive Only"
        default:
            return "(Unknown)"
    }
}

async function delete_pointer(ptr_in) {
    $("a").removeClass("active")
    $(".delete").addClass("active")
    
    $("section").hide().empty()
    
    delete_confirm = $(".delete_confirm").empty().show()
    
    $('<div class="card"><h3 class="card-header">'+base_url+'/'+ptr_in+'</h3>' +
        '<div class="card-body">' +
        '<p>Really delete '+base_url+'/'+ptr_in+'?</p>' +
        '<a href="#show/'+ptr_in+'" class="btn btn-secondary-outline edit">Leave</a>' +
        '<a href="#reallydelete" class="btn btn-danger" id="reallydelete">Yes, Delete</a>' +
        '</div></div>').appendTo(delete_confirm)
    $("#reallydelete").click((evt) => {
        really_delete(ptr_in)
    })
}
    
    
async function really_delete(ptr_in) {
    const result = await do_delete(ptr_in)
    
    if (result === true) {
        successNotif("Deleted "+ptr_in)
    } else {
        errorNotif("Failed to delete "+ptr_in)
    }
    window.location.hash="#list"
}

async function handle_save(evt) {
    let ptr = {}
    ptr.in = $("#pointer_in").val()
    ptr.type = $("#pointer_type_select").val()
    ptr.to = $("#to_address").val()
    ptr.asset_code = $("#currency_select").val()
    ptr.asset_scale = scale_by_asset_code(ptr.asset_code)
    let raw_thresh = $("#threshold").val()
    if (!raw_thresh) {
        thresh_by_asset_code(ptr.asset_code)
    } else {
        ptr.threshold = decimal_to_intscale(raw_thresh, ptr.asset_scale)
    }
    let old_in = $("#old_in").val()
    
    do_save(ptr, old_in)
}

function intscale_to_decimal(amount_s, scale_s) {
    if (scale_s === undefined || scale_s === "") {
        scale = 0
    }
    
    let scaled
    try {
        const n = new Big(amount_s)
        const e = new Big(10).pow(scale_s)
        scaled = n.div(e)
    } catch(e) {
        console.error(e)
        scaled = "NaN"
    }
    
    return scaled.toString()
}

function decimal_to_intscale(decimal_s, scale_s) {
    if (scale_s === undefined || scale_s === "") {
        scale = 0
    }
    
    let int_n
    try {
        const n = new Big(decimal_s)
        const e = new Big(10).pow(scale_s)
        int_n = n.times(e)
    } catch(e) {
        console.error(e)
        int_n = "NaN"
    }
    
    return int_n.toString()
}

function scale_by_asset_code(cur_code) {
    if (cur_code === "USD") return 2
    if (cur_code === "XRP") return 6
    else return 0
}

function thresh_by_asset_code(cur_code) {
    // default payout threshold
    if (cur_code === "USD") return "1"
    if (cur_code === "XRP") return ".001000"
    else return "0"
}

function successNotif(msg) {
    $.bootstrapGrowl(msg, {
      delay: 7000,
      offset: {from: 'bottom', amount: 68},
      type: 'success',
      width: 'auto'
    })
  }
  function errorNotif(msg) {
    $.bootstrapGrowl(msg, {
      delay: 7000,
      offset: {from: 'bottom', amount: 68},
      type: 'danger',
      width: 'auto'
    })
  }


/************ "NETWORK" functions (currently all mocked ***********************/

let mock_pointers = {
    "mduo13": {
      "in": "mduo13",
      "type": "XRPL_ADDRESS",
      "to": "rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn",
      "threshold": "0001",
      "asset_code": "XRP",
      "asset_scale": 6
    },

    "dfuelling": {
      "in": "dfuelling",
      "type": "PAYMENT_POINTER",
      "to": "$example.com/david",
      "threshold": "0001",
      "asset_code": "HAK",
      "asset_scale": 0
    }
}

async function get_pointers() {
    // TODO: actually get from API
//    const resp = await ($.get(api_base+"/pointers", {dataType:"json"}))
//      // do something with resp
    
    ////////// MOCK BELOW //////////////////////////////
    // convert mock dictionary to array
    let ptrs = []
    for (var key in mock_pointers) {
      if (mock_pointers.hasOwnProperty(key)) {
        ptrs.push(mock_pointers[key])
      }
    }
      
    return {
      "pointers": ptrs
    }
}

async function get_status(ptr_in) {
    // TODO: actually get from API
//    const url = api_base+"/pointers/"+encodeURI(ptr_in)
//    const resp = await ($.get(url, {dataType:"json"}))
    
    
    let extended_ptr = $.extend(true, {}, mock_pointers[ptr_in])
    if (extended_ptr.in == "mduo13") {
        extended_ptr["balance"] = "1300001"
    } else if (extended_ptr.in == "dfuelling") {
        extended_ptr["balance"] = "47"
    } else {
        extended_ptr["balance"] = Math.floor(Math.random()*(10**(Math.floor(Math.random()*10)))).toString()
    }
    return extended_ptr
}

async function do_delete(ptr_in) {
    // TODO DELETE w/ API
    // const url = api_base+"/pointers/"+encodeUR(ptr_in)
    // const result = await ($.ajax(url, {method: "DELETE"}))
    
    if (mock_pointers.hasOwnProperty(ptr_in)) {
        delete mock_pointers[ptr_in]
        return true
    } else {
        return false
    }
}

async function do_save(ptr, old_in) {
    // TODO $.post to API
    // let url
    // if (old_in) {
    //   url = api_base+"/pointers/"+encodeUR(old_in)
    // } else {
    //   url = api_base+"/pointers/"+encodeUR(ptr.in)
    // }
    
    if (old_in && mock_pointers.hasOwnProperty(old_in)) {
        let bal = mock_pointers[old_in].balance
        ptr.balance = bal
        delete mock_pointers[old_in]
    } else {
        //console.log("old_in:", old_in, "has it?", mock_pointers.hasOwnProperty(old_in))
    }
    mock_pointers[ptr.in] = ptr
    successNotif("Saved! "+JSON.stringify(ptr,null,2))
}


/********************* END ****************************************************/

$(document).ready(() => {
    on_ready()
})
