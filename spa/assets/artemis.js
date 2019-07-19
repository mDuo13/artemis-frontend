let base_url = "$artemis-pointers.dev"

async function on_ready() {

    handle_hashchange()
    
    $( window ).on( 'hashchange', handle_hashchange )
}

function handle_hashchange(evt) {
    const path_match = (/^#(create|list|edit|show|delete)\/?(.*)$/).exec(window.location.hash)
    if (path_match === null) list_pointers()
    else if (path_match[1] == "create") create_pointer()
    else if (path_match[1] == "list") list_pointers()
    else if (path_match[1] == "edit" && path_match[2]) edit_pointer(path_match[2])
    else if (path_match[1] == "show" && path_match[2]) show_pointer(path_match[2])
    else if (path_match[1] == "delete" && path_match[2]) delete_pointer(path_match[2])
    else list_pointers()
}

async function list_pointers() {
    $("a").removeClass("active")
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
            '<a href="#show/'+ptr.in+'" class="btn btn-primary show">View status</a>' +
            '<a href="#edit/'+ptr.in+'" class="btn btn-secondary edit">Edit</a>' +
            '<a href="#delete/'+ptr.in+'" class="btn btn-danger delete">Delete</a>' +
            '</div>' +
            '</div>').appendTo(pointerlist)
    })
    $('<a class="create btn btn-primary" href="#create">Create New Pointer</a>').appendTo(pointerlist).click(create_pointer)
}

async function show_pointer(ptr_in) {
    $("a").removeClass("active")
    $(".show").addClass("active")
    
    $("section").hide()
    
    const pointer_status = $(".pointer_status")
    pointer_status.empty().show()
    
    const ptr = await get_status(ptr_in)
    
    console.log("ptr:", ptr)
    let scaled_balance
    if (ptr.balance === undefined) {
        scaled_balance = "0"
    } else {
        scaled_balance = intscale_to_decimal(ptr.balance, ptr.currency_scale)
    }
    
    let scaled_thresh
    if (ptr.threshold === undefined) {
        scaled_thresh = "0"
    } else {
        scaled_thresh = intscale_to_decimal(ptr.threshold, ptr.currency_scale)
    }
    
    $('<div class="card"><h3 class="card-header">'+base_url+'/'+ptr.in+'</h3>' +
        '<div class="card-body">' +
        '<p class="card-text pointer-type">' + 
        '<strong>Type:</strong> ' + pretty_type(ptr) + '</p>' +
        '<p class="card-text pointer-dest">' +
        '<strong>To:</strong> <span class="'+ ptr.type + '">' + ptr.to + '</span>' +
        '</p>' +
        '<p><strong>Incoming Pointer:</strong> '+ptr.in+'</p>' +
        '<p><strong>Balance:</strong> '+scaled_balance+'</p>' +
        '<p><strong>Threshold:</strong> '+scaled_thresh+'</p>' +
        '<a href="#edit/'+ptr.in+'" class="btn btn-secondary edit">Edit</a>' +
        '<a href="#delete/'+ptr.in+'" class="btn btn-danger delete">Delete</a>' +
        '</div></div>').appendTo(pointer_status)
    
}

async function create_pointer(evt) {
    $("a").removeClass("active")
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
    pointer_edit_ui(ptr_status)
}

async function pointer_edit_ui(ptr) {
    $("section").hide()
    const editbox = $(".pointer_editor")
    editbox.empty().show()
    
    let scaled_threshold
    if (ptr.hasOwnProperty("threshold")) {
        display_threshold = intscale_to_decimal(ptr.threshold, ptr.currency_scale)
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
        '<label for="currency_select" class="col-sm-3" id="currency_select_label"><strong>Currency:</strong></label> ' +
        '<select class="form-control col-sm-9 hide" id="currency_select">'+
          '<option value="USD"'+(ptr.currency_code=="USD"?" selected":"")+'>United States Dollar (USD)</option>' +
          '<option value="XRP"'+(ptr.currency_code=="XRP"?" selected":"")+'>XRP</option>' +
          '<option value="HAK"'+(ptr.currency_code=="HAK"?" selected":"")+'>Hackathon Points (HAK)</option>' +
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
    $('<a class="save btn btn-primary" href="#save">Save Pointer</a>').appendTo(editbox).click(handle_save)
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
    ptr.currency_code = $("#currency_select").val()
    ptr.currency_scale = scale_by_currency_code(ptr.currency_code)
    let raw_thresh = $("#threshold").val()
    if (!raw_thresh) {
        thresh_by_currency_code(ptr.currency_code)
    } else {
        ptr.threshold = decimal_to_intscale(raw_thresh, ptr.currency_scale)
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

function scale_by_currency_code(cur_code) {
    if (cur_code === "USD") return 2
    if (cur_code === "XRP") return 6
    else return 0
}

function thresh_by_currency_code(cur_code) {
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
      "currency_code": "XRP",
      "currency_scale": 6
    },

    "dfuelling": {
      "in": "dfuelling",
      "type": "PAYMENT_POINTER",
      "to": "$example.com/david",
      "threshold": "0001",
      "currency_code": "HAK",
      "currency_scale": 0
    }
}

async function get_pointers() {
    // TODO: actually get from API
    
    
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

async function get_status(pointer_in) {
    // TODO: actually get from API
    
    
    let extended_ptr = $.extend(true, {}, mock_pointers[pointer_in])
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
    
    if (mock_pointers.hasOwnProperty(ptr_in)) {
        delete mock_pointers[ptr_in]
        return true
    } else {
        return false
    }
}

async function do_save(ptr, old_in) {
    // TODO $.post to API
    
    if (old_in && mock_pointers.hasOwnProperty(old_in)) {
        let bal = mock_pointers[old_in].balance
        ptr.balance = bal
        delete mock_pointers[old_in]
    } else {
        console.log("old_in:", old_in, "has it?", mock_pointers.hasOwnProperty(old_in))
    }
    mock_pointers[ptr.in] = ptr
    successNotif("Saved! "+JSON.stringify(ptr,null,2))
}


/********************* END ****************************************************/

$(document).ready(() => {
    on_ready()
})
