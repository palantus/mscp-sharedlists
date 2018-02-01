var isListMode = false;
var curBucket = "";
var curList = "";
var cachedBuckets = {};
var cachedLists = {};
var listRefreshId = 0;
var refreshTimer = null;
var curBucketJSON = null;
var curListJSON = null;

$(function() {
  installServiceWorker();
  mscp.ready.then(init)
});

function init(){

	if(typeof(Storage)!=="undefined"){
		cachedBuckets = localStorage.buckets;
		cachedLists = localStorage.lists;
	} else {
		cachedBuckets = $.cookie("buckets");
		cachedLists = $.cookie("lists");
	}

	if(!cachedBuckets)
		cachedBuckets = {};
	else if(typeof(cachedBuckets) === "string")
		cachedBuckets = JSON.parse(cachedBuckets);

	if(!cachedLists)
		cachedLists = {};
	else if(typeof(cachedLists) === "string")
		cachedLists = JSON.parse(cachedLists);

	if(getUrlVar("b") != undefined){
		curBucket = getUrlVar("b");
	}
	if(getUrlVar("l") != undefined){
		curList = getUrlVar("l");
		setListMode();
	}


	$.detectSwipe.threshold = 100;
	$.detectSwipe.preventDefault = false;
	$(document).on("swiperight", function() {
		$("#back:visible").click();
		return true;
	});

  /* Does'nt work properly, as it prevents clicks on items when the window isn't in focus (link when clicking refresh button in browser)
	$(window).focus(function() {
    if(isListMode)
      refreshList();
    else
      refreshBucket();
	})
  */

	refreshBucket();

	setTimeout(function(){
		initFunctionality();
	}, 500);
}

function initFunctionality(){

	$(document).keyup(function(e){
		var focusElement = $(":focus");
		if(focusElement.length > 0 && (focusElement[0].nodeName == "TEXTAREA" || focusElement[0].nodeName == "INPUT"))
			return;

		if(e.ctrlKey || e.shiftKey || e.altKey)
			return;

		switch(e.which){
			case 65 : // a
			case 107 : // +
				$("#additem:visible").click();
				break;
			case 66 : // b
			case 8 : // backspace
				$("#back:visible").click();
				break;
			case 67 : // c
				$("#clearcompleted:visible").click();
				break;
			case 49 : // 1
			case 50 : // 2
			case 51 : // 3
			case 52 : // 4
			case 53 : // 5
			case 54 : // 6
			case 55 : // 7
			case 56 : // 8
			case 57 : // 9
				$("#maintable tr:nth-child(" + (e.which - 48) + ")").click();
				break;
			case 97 : // 1
			case 98 : // 2
			case 99 : // 3
			case 100 : // 4
			case 101 : // 5
			case 102 : // 6
			case 103 : // 7
			case 104 : // 8
			case 105 : // 9
				$("#maintable tr:nth-child(" + (e.which - 96) + ")").click();
				break;
		}
	});

	$("#openbucket").click(function(){
		var bid = prompt("Enter a bucket ID or leave empty to generate a new random ID:");
		if (bid !== null && bid !== false) { // Canceled

			if(!bid)
				bid = guid();

			window.location = "?b=" + bid;
		}
	});

	$("#back").click(function(){
		setBucketMode();
	});

	$("#sort").click(function(){
		if(isListMode){
      localStorage.listsSort = localStorage.listsSort !== undefined ? (localStorage.listsSort == "false" ? "true" : "false") : "true";
			refreshList(true);
    }
	});

	$("#clearcompleted").click(async function(){
    let list = await mscp.ClearCompleted(curList)
    if(list != null){
      $("#offline").hide();
			cachedLists[list.listId] = list;
			cacheData();
			refreshList(true);
    } else {
      $("#offline").show();
    }
	});

	$("#additem").click(function(){
    $("#newitemtitle").val("");
    $("#newitem").fadeIn("fast", () => $("#newitemtitle").focus());
	});

  $("#newitem .ok").click(e => {
    mscp.AddListItem(curList, $("#newitemtitle").val()).then((list) => {
      if(list != null){
        $("#offline").hide();
        cachedLists[list.listId] = list;
        cacheData();
        refreshList(true);
      } else {
        $("#offline").show();
      }
    })
    $("#newitem").fadeOut("fast")
  })
  $("#newitem .cancel").click(e => $("#newitem").fadeOut("fast"));
  $("#newitemtitle").keydown(e => {if(e.which == 13) $("#newitem .ok").click();});

  $("body").keydown(e => {if(e.which == 27) $("div.popup").fadeOut("fast")})
  $("div.popup").click(e => {
    if($(e.target).is("div"))
      $("div.popup").fadeOut("fast");
  })

	$("#addlist").click(async function(){
		var id = prompt("Enter a list ID if you want to open a specific list or nothing if you want to create a new:");
		if (id !== null && id !== false) { // Canceled
			if(!id)
				id = guid();
			curList = id;
      await mscp.AddListToBucket(curBucket, curList)
			setListMode();
		}
	});

	$("#removelist").click(async function(){
		if(confirm("Do you really want to remove the list from your bucket?")){
      let bucket = await mscp.RemoveListFromBucket(curBucket, curList)
      if(bucket != null){
        $("#offline").hide();
				cachedBuckets[bucket.bucketId] = bucket;
				cacheData();
				setBucketMode();
				refreshBucket(true);
      } else {
        $("#offline").show();
      }
		}
	});

	$("#title").click(titleClick);
	$("#title").longpress(function(){
		if(isListMode)
			prompt("Use this to copy list ID:", curList);
		else
			prompt("Use this to copy bucket ID:", curBucket);
	});

  $("#showfunctions").click(() => {$("#additionalfunctions").fadeIn("fast"); $("#additionalfunctions button:first-child").focus();});
  $("#uncomplete").click(() => {
    mscp.UncompleteAll(curList).then((list) => {
      if(list != null){
        $("#offline").hide();
        cachedLists[list.listId] = list;
        cacheData();
        refreshList(true);
      } else {
        $("#offline").show();
      }
    })
    $("#additionalfunctions").fadeOut("fast");
  })
  $("#backup").click(() => {backup(); $("#additionalfunctions").fadeOut("fast");});
}

async function refreshBucket(onlyRefresh){
	if(isListMode)
		return;

	if(!onlyRefresh){
		let bucket = await getBucket(curBucket)
    if(bucket != null){
  		if(JSON.stringify(cachedBuckets[bucket.bucketId]) != JSON.stringify(bucket)){
  			cachedBuckets[bucket.bucketId] = bucket;
  			cacheData();
  		}
      if(JSON.stringify(bucket) == curBucketJSON){
        return; //No changes
      }
    }
	}

	$("#title").html("");
	tab = $("#maintable tbody");
	tab.empty();

	var b = cachedBuckets[curBucket];
	if(b){
    curBucketJSON = JSON.stringify(b)
		$("#title").html(b.Title);
		var bucketLists = b.lists.sort(function(a, b){return a.Title.toLowerCase() > b.Title.toLowerCase() ? 1 : -1;});
		for(let list of bucketLists){
			var tr = $("<tr/>");
			var td = $("<td/>");
			td.html(list.Title);
			tr.data("list", list);


			tr.click(function(){
				var list = $(this).data("list");
				curList = list.id;
				setListMode();
			});

			tr.append(td);
			tab.append(tr);
		}
	}
}

async function refreshList(onlyRefresh){
	if(!isListMode)
		return;

	if(!onlyRefresh){
		listRefreshId++;
		var thisRefreshId = listRefreshId;

		let list = await getList();
    if(list != null){
			if(JSON.stringify(cachedLists[list.listId]) != JSON.stringify(list)){
				if(thisRefreshId < listRefreshId)
					return;

				cachedLists[list.listId] = list;
				cacheData();
			}
      if(JSON.stringify(list) == curListJSON){
        return; //No changes
      }
		}
	}

	$("#title").html("");
	tab = $("#maintable tbody");
	tab.empty();

	var l = cachedLists[curList];
	if(l){
    curListJSON = JSON.stringify(l)
		$("#title").html(getUrlVar("title") || l.Title);
    let listItems = localStorage.listsSort === "true" ? JSON.parse(JSON.stringify(l.items)).sort((a, b) => (a.Title.toLowerCase() < b.Title.toLowerCase() ? -1 : 1)) : l.items;
		for(let item of listItems){
			var tr = $("<tr/>");

			var td = $("<td/>", {class:"completedcheckbox"});
			td.append(item.finished? "&#10004;" : "&nbsp;");
			tr.append(td);

			td = $("<td/>");
			td.append(item.Title);
			tr.append(td);

      if(!isMobile()){
  			td = $("<td/>", {class:"grab"});
  			td.append("&#9776;");
  			tr.append(td);
      }

			tr.data("item", item);

			tr.mouseup(async function(e){
				clearTimeout(refreshTimer);

        var test = $(".grabbed");

        if($(".grabbed").length > 0)
          return;

				var item = $(this).data("item");
				item.finished = !item.finished;
				refreshList(true);

        let list = await mscp.ToggleListItem(curList, item.id)
        if(list != null){
          clearTimeout(refreshTimer);
					refreshTimer = setTimeout(refreshList, 2000);
					$("#offline").hide();
        } else {
          $("#offline").show();
        }
			});

			if(typeof(tr.longpress) === "function"){
				tr.longpress(async function(){
					var item = $(this).data("item");
					if(item){
						var newTitle = prompt("Enter a new title:", item.Title);
						if(newTitle){
              await mscp.RenameListItem(curList, item.id, newTitle)
              $("#offline").hide();
              refreshList();
						}
					}
					return true;
				});
			}

			tab.append(tr);
		}

    makeItemsMovable(async function(item, index){
      await mscp.MoveItemToIndex(curList, item.id, index)
    })
	}
}

async function titleClick(){
	var newTitle = prompt("Enter a new title:");
	if(!newTitle)
    return;

  if(isListMode){
    let list = await mscp.ChangeListName(curList, newTitle)
    if(list != null){
      $("#offline").hide();
      cachedLists[curList] = list;
      cacheData();
  		refreshList(true);
    } else {
      $("#offline").show();
    }
  } else {
    let bucket = await mscp.ChangeBucketName(curBucket, newTitle)
    if(bucket != null){
      $("#offline").hide();
      cachedBuckets[curBucket] = bucket;
      cacheData();
  		refreshBucket(true);
    } else {
      $("#offline").show();
    }
  }
}

async function getBucket(){
  let bucket = null
  try {
    bucket = await mscp.GetBucket(curBucket);
    if(bucket != null)
      $("#offline").hide();
    else
      $("#offline").show();
  } catch (e) {
    $("#offline").show();
  }

  return bucket;
}

async function getList(){
  let list = null
  try {
    list = await mscp.GetList(curList);
    if(list != null)
      $("#offline").hide();
    else
      $("#offline").show();
  } catch (e) {
    $("#offline").show();
  }

  return list;
}

function cacheData(){
	if(typeof(Storage)!=="undefined"){
		localStorage.buckets = JSON.stringify(cachedBuckets);
		localStorage.lists = JSON.stringify(cachedLists);
	} else {
		$.cookie("buckets", JSON.stringify(cachedBuckets));
		$.cookie("lists", JSON.stringify(cachedLists));
	}
}

function setListMode(){
	clearTimeout(refreshTimer);
	isListMode = true;
	if(curBucket){
		$("#back").show();
		$("#removelist").show();
	} else {
    $("#topbar").hide();
    $("#content").css({top: "0px"})
    $("#maintable").css({"margin-top": "10px"})
  }
	$("#openbucket").hide();
	$("#addlist").hide();
	$("#bottombar").show();
  curListJSON = null;
	refreshList();
}

function setBucketMode(){
	clearTimeout(refreshTimer);
	isListMode = false;
	$("#back").hide();
	$("#removelist").hide();
	$("#openbucket").show();
	$("#addlist").show();
	$("#bottombar").hide();
  curBucketJSON = null;
	refreshBucket();
}

function saveAs(uri, filename) {
  var link = document.createElement('a');
  if (typeof link.download === 'string') {
    link.href = uri;
    link.download = filename;

    //Firefox requires the link to be in the body
    document.body.appendChild(link);

    //simulate click
    link.click();

    //remove the link when done
    document.body.removeChild(link);
  } else {
    window.open(uri);
  }
}

function makeItemsMovable(callback){
  $(".grab").mousedown(function (e) {
    var tr = $(e.target).closest("TR"), si = tr.index(), sy = e.pageY, b = $(document.body), drag;

    b.addClass("grabCursor").css("userSelect", "none");
    tr.addClass("grabbed");
    function move (e) {
        if (!drag && Math.abs(e.pageY - sy) < 10)
          return;
        drag = true;
        tr.siblings().each(function() {
            var s = $(this), i = s.index(), y = s.offset().top;
            if (i >= 0 && e.pageY >= y && e.pageY < y + s.outerHeight()) {
                if (i < tr.index())
                    s.insertAfter(tr);
                else
                    s.insertBefore(tr);
                return false;
            }
        });
    }
    function up (e) {
        if (drag && si != tr.index()) {
            drag = false;
            callback(tr.data("item"), tr.index());
        }
        $(document).unbind("mousemove", move).unbind("mouseup", up);
        b.removeClass("grabCursor").css("userSelect", "none");
        tr.removeClass("grabbed");
        e.stopPropagation();
    }
    $(document).mousemove(move).mouseup(up);
    e.stopPropagation();
  });
}

function backup(){
  alert("This downloads a backup with the content of all lists that has been opened using this browser");
  saveAs('data:application/json,' + encodeURIComponent(JSON.stringify(cachedLists, null, 4)), "backup.json")
}

function getUrlVar( name ){
    name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
    var regexS = "[\\?&]"+name+"=([^&#]*)";
    var regex = new RegExp( regexS );
    var results = regex.exec( window.location.href );
    if( results == null )
        return undefined;
    else
        return decodeURIComponent(results[1]);
}

function s4() {
  return Math.floor((1 + Math.random()) * 0x10000)
             .toString(16)
             .substring(1);
};

function guid() {
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
         s4() + '-' + s4() + s4() + s4();
}

window.isMobile = function() {
	var check = false;
	(function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4)))check = true})(navigator.userAgent||navigator.vendor||window.opera);
	return check;
}

function installServiceWorker(){
	if ('serviceWorker' in navigator) {
	  navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(function(reg) {

	    if(reg.installing) {
	      console.log('Service worker installing');
	    } else if(reg.waiting) {
	      console.log('Service worker installed');
	    } else if(reg.active) {
	      console.log('Service worker active');
	    }

	  }).catch(function(error) {
	    // registration failed
	    console.log('Registration failed with ' + error);
	  });
	}
}
