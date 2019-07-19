let base_url = "$artemis-pointers.dev"

async function on_ready() {

    switch (window.location.hash) {
        case "#create":
            create_pointer()
            break;
        default:
            list_pointers()
            break
    }
    
    $(".createpointer").click(create_pointer)
    $(".listpointers").click(list_pointers)
}

async function list_pointers() {
    $("a").removeClass("active")
    $(".listpointers").addClass("active")
    
    $("section").hide()
    
    data = await get_pointers()
    const pointerlist = $(".pointerlist")
    pointerlist.empty().show()
    
    data.pointers.forEach((ptr) => {
        let pretty_type
        switch(ptr.type) {
            case "XRPL_ADDRESS":
                pretty_type = "XRP Ledger Address"
                break
            case "PAYMENT_POINTER":
                pretty_type = "Payment Pointer"
                break
            case "SPSP_URL":
                pretty_type = "SPSP URL"
                break
            case "NONE":
                pretty_type = "Receive Only"
                break
            default:
                pretty_type = "(Unknown)"
                break
        }
        
        
        $('<div class="card pointer"><h3 class="card-header">'+ base_url +'/'+ptr.in+'</h3>' +
            '<div class="card-body"><p class="card-text pointer-type">' + 
            '<strong>Type:</strong> ' + pretty_type + '</p>' +
            '<p class="card-text pointer-dest">' +
            '<strong>To:</strong> <span class="'+ ptr.type + '">' + ptr.to + '</span>' +
            '</p>' +
            '<a href="#" class="btn btn-primary">View status</a>' +
            '<a href="#" class="btn btn-secondary">Edit</a>' +
            '<a href="#" class="btn btn-danger">Delete</a>' +
            '</div>' +
            '</div>').appendTo(pointerlist)
    })
    $('<a class="createpointer btn btn-primary" href="#create">Create New Pointer</a>').appendTo(pointerlist).click(create_pointer)
}

async function create_pointer() {
    $("a").removeClass("active")
    $(".createpointer").addClass("active")
    
    $("section").hide()
    const editbox = $(".edit")
    editbox.empty().show()
    
    $('<div class="card"><h3 class="card-header">Create Pointer</h3>' +
        '<div class="card-body"><form>'+
        '<label for="pointer_in"><strong>Incoming Pointer:</strong></label>' +
        '<div class="form-group row">' +
        '<label for="pointer_in" class="col-sm-3">'+base_url+'/'+'</label>' +
        '<div class="col-sm-9">' +
        '<input type="text" class="form-control" value="" id="pointer_in" />' +
        '</div>' +
        '<label for="pointer_type_select" class="col-sm-3"><strong>Pointer Type:</strong></label> ' +
        '<select class="form-control col-sm-9" id="pointer_type_select">'+
          '<option value="XRPL_ADDRESS">XRP Ledger Address</option>' +
          '<option value="PAYMENT_POINTER">Payment Pointer</option>' +
          '<option value="SPSP_URL">SPSP URL</option>' +
          '<option value="NONE">Receive Only</option>' +
        '</select>' +
        '<label for="to_address" class="col-sm-3"><strong>Deliver To:</strong></label>' +
        '<input type="text" class="form-control col-sm-9" value="" id="to_address" />' +
        '<label for="threshold" class="col-sm-3"><strong>Threshold:</strong></label>' +
        '<input type="text" class="form-control col-sm-9" value="" id="threshold" />' +
        '</div></form></div></div>').appendTo(editbox)
    $("#pointer_type_select").change(select_type)
    $('<a class="save btn btn-primary" href="#save">Save Pointer</a>').appendTo(editbox)
}

function select_type(event) {
    const selected_type = $("#pointer_type_select").val()
    if (selected_type == "NONE") {
        $("#threshold").prop("disabled", true)
        $("#to_address").prop("disabled", true)
    } else {
        $("#threshold").prop("disabled", false)
        $("#to_address").prop("disabled", false)
    }
}

async function get_pointers() {
    return {
      "pointers": [
        {
          "in": "mduo13",
          "type": "XRPL_ADDRESS",
          "to": "rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn"
        },

        {
          "in": "dfuelling",
          "type": "PAYMENT_POINTER",
          "to": "$example.com/david"
        }
      ]
    }
}

$(document).ready(() => {
    on_ready()
})
