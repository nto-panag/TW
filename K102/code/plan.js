function get_travel_times(attackers, defenders, speed) {
    var travel_times = new Array();
    for (var a_count = 0; a_count < attackers.length; a_count++) {
        var attacker = attackers[a_count].split("|");
        travel_times[attackers[a_count]] = new Array();
        for (var d_count = 0; d_count < defenders.length; d_count++) {
            var defender = defenders[d_count].split("|");
            var x = attacker[0] - defender[0];
            var y = attacker[1] - defender[1];
            var distance = Math.sqrt((x * x) + (y * y));
            travel_times[attackers[a_count]][defenders[d_count]] = distance * speed * 60;
        }
    }
    return travel_times;
}

function get_plan(travel_times, max_attack, type) {
    var plan = new Array();
    var used_targets = new Array();
    
    // Μετατρέπουμε σε λίστα για να τηρηθεί η σειρά που έβαλε ο χρήστης
    var attacker_list = Object.keys(travel_times);

    for (var i = 0; i < attacker_list.length; i++) {
        var attack = attacker_list[i];
        var fastest = 9999999999.0;
        var target = "";
        var travel_time = "";

        for (var defend in travel_times[attack]) {
            if (typeof used_targets[defend] === 'undefined') { used_targets[defend] = 0; }
            
            // Έλεγχος αν ο στόχος έχει πιάσει το όριο (π.χ. τα 3 Nukes)
            if (used_targets[defend] < max_attack) {
                if (travel_times[attack][defend] < fastest) {
                    target = defend;
                    travel_time = travel_times[attack][defend];
                    fastest = travel_time;
                }
            }
        }

        if (target != "") {
            used_targets[target] = used_targets[target] + 1;
            plan[attack] = new Array();
            plan[attack]['target'] = target;
            plan[attack]['travel_time'] = travel_time;
            plan[attack]['type'] = type;
        }
    }
    return plan;
}

function get_troop(type) {
    var troop = "";
    if (type == "nobel") return "[unit]snob[/unit]";
    if (type == "nuke") troop = $("select#nuke_unit").val();
    else if (type == "support") troop = $("select#support_unit").val();

    switch (troop) {
        case "9": return "[unit]spy[/unit]";
        case "10": return (type == "nuke") ? "[unit]light[/unit]" : "[unit]knight[/unit]";
        case "11": return "[unit]heavy[/unit]";
        case "18": return (type == "nuke") ? "[unit]axe[/unit]" : "[unit]spear[/unit]";
        case "22": return "[unit]sword[/unit]";
        case "30": return (type == "nuke") ? "[unit]ram[/unit]" : "[unit]catapult[/unit]";
        default: return "[unit]ram[/unit]";
    }
}

function get_twcode(plan, land_time) {
    var twcode = "[table] [**]Μονάδα[||]Από[||]Στο[||]Εκκίνηση[/**] ";
    var parts = land_time.split(/[\s/:]/);
    var targetDate = new Date(parts[2], parts[1] - 1, parts[0], parts[3], parts[4], parts[5]);

    for (var i = 0; i < plan.length; i++) {
        var p = plan[i];
        var colour = (p.type == "nobel") ? "#2eb92e" : (p.type == "nuke" ? "#ff0e0e" : "#0eaeae");
        var launch_ms = targetDate.getTime() - (p.travel_time * 1000);
        var launch = new Date(launch_ms);
        var lDate = ("0" + launch.getDate()).slice(-2) + "/" + ("0" + (launch.getMonth() + 1)).slice(-2) + "/" + launch.getFullYear() + " " + ("0" + launch.getHours()).slice(-2) + ":" + ("0" + launch.getMinutes()).slice(-2) + ":" + ("0" + launch.getSeconds()).slice(-2);
        twcode += "[*]" + get_troop(p.type) + "[|][coord]" + p.attacker + "[/coord][|][coord]" + p.target + "[/coord][|][b][color=" + colour + "]" + lDate + "[/color][/b][/*]";
    }
    twcode += "[/table]";
    return twcode;
}

function merge(array1, array2) {
    for (var element in array2) {
        if (typeof array1[element] === 'undefined') {
            array1[element] = array2[element];
        }
    }
    return array1;
}

function clean(clean_me, of_these) {
    if (!clean_me) return null;
    var cleaned = new Array();
    for (var i = 0; i < clean_me.length; i++) {
        if (of_these.indexOf(clean_me[i]) == -1) {
            cleaned.push(clean_me[i]);
        }
    }
    return cleaned.length > 0 ? cleaned : null;
}

function sort(array) {
    var sorted = new Array();
    var temp = new Array();
    for (var element in array) {
        if (array[element] && array[element]['travel_time']) {
            temp.push({
                attacker: element,
                target: array[element]['target'],
                type: array[element]['type'],
                travel_time: array[element]['travel_time']
            });
        }
    }
    // Ταξινόμηση ώστε οι πιο μακρινές επιθέσεις (μεγαλύτερο travel_time) να βγαίνουν πρώτες
    temp.sort(function(a, b) { return b.travel_time - a.travel_time; });
    return temp;
}

$(function() {
    $("button#make_plan, button:contains('ΦΤΙΑΞΕ')").click(function(e) {
        e.preventDefault(); 
        var coord_regex = /[0-9]{1,3}\|[0-9]{1,3}/g;
        var world_speed = parseFloat($("input#world_speed").val()) || 1;
        var unit_speed = parseFloat($("input#unit_speed").val()) || 1;
        var arrival_time = $("input#arrival_time").val();
        
        var nuke_val = parseFloat($("select#nuke_unit").val()) || 18;
        var nuke_speed = nuke_val / world_speed / unit_speed;
        var support_val = parseFloat($("select#support_unit").val()) || 22;
        var support_speed = support_val / world_speed / unit_speed;
        var noble_speed = 35 / world_speed / unit_speed;

        var noble_coords = ($("textarea#noble_coords").val() || "").match(coord_regex);
        var nuke_raw = ($("textarea#nuke_coords").val() || "").match(coord_regex);
        var support_raw = ($("textarea#support_coords").val() || "").match(coord_regex);
        var target_raw = ($("textarea#target_coords").val() || "").match(coord_regex);

        if (!target_raw) { alert("Βάλε στόχους!"); return; }

        var nuke_coords = noble_coords ? clean(nuke_raw, noble_coords) : nuke_raw;
        var support_coords = clean(support_raw, (noble_coords || []).concat(nuke_coords || []));

        var nuke_count = parseInt($("input#nuke_count").val()) || 1;
        var support_count = parseInt($("input#support_count").val()) || 1;
        var noble_count = parseInt($("input#noble_count").val()) || 1;

        var all_plans = new Array();

        if (noble_coords) {
            var noble_times = get_travel_times(noble_coords, target_raw, noble_speed);
            all_plans = merge(all_plans, get_plan(noble_times, noble_count, "nobel"));
        }
        if (nuke_coords) {
            var nuke_times = get_travel_times(nuke_coords, target_raw, nuke_speed);
            all_plans = merge(all_plans, get_plan(nuke_times, nuke_count, "nuke"));
        }
        if (support_coords) {
            var support_times = get_travel_times(support_coords, target_raw, support_speed);
            all_plans = merge(all_plans, get_plan(support_times, support_count, "support"));
        }

        var sorted_plan = sort(all_plans);
        var new_plan_code = get_twcode(sorted_plan, arrival_time);
        
        var resultsField = $("textarea#results");
        var old_val = resultsField.val();
        
        if (old_val && old_val.trim().length > 0) {
            resultsField.val(old_val + "\n\n" + new_plan_code);
        } else {
            resultsField.val(new_plan_code);
        }
    });

    $(document).on('click', 'button:contains("Αντιγραφή")', function(e) {
        e.preventDefault();
        var copyText = document.getElementById("results");
        if (copyText && copyText.value != "") {
            copyText.select();
            document.execCommand("copy");
            alert("Το πλάνο αντιγράφηκε στο πρόχειρο!");
        } else {
            alert("Δεν υπάρχει πλάνο για αντιγραφή!");
        }
    });
});

$(document).ready(function() {
    if($.fn.datetimepicker) {
        $('#arrival_time').datetimepicker({
            showSecond: true,
            dateFormat: 'dd/mm/yy',
            timeFormat: 'hh:mm:ss',
            stepMinute: 1,
            stepSecond: 1
        });
    }
});
