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

	$(window).focus(function() {
    if(isListMode)
      refreshList();
    else
      refreshBucket();
	})

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
    }
    if(JSON.stringify(bucket) == curBucketJSON){
      return; //No changes
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
		}
    if(JSON.stringify(list) == curListJSON){
      return; //No changes
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

			tr.data("item", item);

			tr.click(async function(){
				clearTimeout(refreshTimer);

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
  let bucket = await mscp.GetBucket(curBucket);
  $("#offline").hide();
  if(bucket != null)
    return bucket;
  else
    $("#offline").show();
  return null;
}

async function getList(){
  let list = await mscp.GetList(curList);
  $("#offline").hide();
  if(list != null)
    return list;
  else
    $("#offline").show();
  return null;
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

function isMobileOrNarrow(){
	return isMobile() || $(window).innerWidth() < 450;
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
