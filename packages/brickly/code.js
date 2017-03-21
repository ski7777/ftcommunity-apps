// Brickly specifc javascript code

var Code = {};
var USER_FILES = "user/"
var MAX_TEXT_LINES = 50;
Code.workspace = null;
Code.Msg = {};
Code.speed = 90;                                     // 90% default speed
Code.skill = 1;                                      // GUI level: 1 = beginner ... expert
Code.program_name = [ "brickly-0.xml", "Brickly" ];  // default file name and program name
Code.connected = false;
Code.spinner = null;
Code.files = [ ]        // array of program filenames and names
Code.plugins = { }      // array of plugin names and descriptions

function export_svg() {
    aleph = Code.workspace.svgBlockCanvas_.cloneNode(true);
    aleph.removeAttribute("width");
    aleph.removeAttribute("height");

    if (aleph.children[0] !== undefined) {
        aleph.removeAttribute("transform");
        aleph.children[0].removeAttribute("transform");
        aleph.children[0].children[0].removeAttribute("transform");
        var linkElm = document.createElementNS("http://www.w3.org/1999/xhtml", "style");
        linkElm.textContent = Blockly.Css.CONTENT.join('') + '\n\n';
        aleph.insertBefore(linkElm, aleph.firstChild);
        //$(aleph).find('rect').remove();
        var bbox = document.getElementsByClassName("blocklyBlockCanvas")[0].getBBox();
        var xml = new XMLSerializer().serializeToString(aleph);
        xml = '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="'+bbox.width+'" height="'+bbox.height+'" viewBox="-10 -20 '+(bbox.width+10)+' '+(bbox.height+10)+'"><rect width="100%" height="100%" fill="white"></rect>'+xml+'</svg>';

	var img_win = window.open();
	img_win.document.open();
	img_win.document.write(xml);
	img_win.document.close();
//	img_win.print();
//	img_win.close();
    }
}

/* When the user clicks on the button, */
/* toggle between hiding and showing the dropdown content */
function menu_show() {
    document.getElementById("dropdown_content").classList.toggle("show");
}

function menu_close() {
    document.getElementById("dropdown_content").classList.remove("show");
}

function menu_disable(disabled) {
    if(disabled) {
	document.getElementById("dropdown_button").classList.add("not-active");
	menu_close();
    } else
	document.getElementById("dropdown_button").classList.remove("not-active");
}

// check if a program with that filename exists
function file_exists(a) {
    for(var i = 0; i < Code.files.length; i++) 
	if(Code.files[i][0] == a) return true;

    return false;
}

// check if a program with that name exists
function name_exists(a) {
    for(var i = 0; i < Code.files.length; i++) 
	if(Code.files[i][1] == a) return true;

    return false;
}

// make sure the user doesn't use html tags in the program name
function htmlEscape(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function htmlDecode(str){
    return str
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
}

/* construct the main menu */
function menu_update() {
    document.getElementById("dropdown_new").innerHTML = MSG['dropdown_new'];
    menu_disable(false);
    menu_append_files(Code.files);
    menu_text_edit();                    // enable/disable "new" button as required
}

function menu_text_edit() {
    // check for current text and disable new button if such a name
    // already exists
    var name = htmlEscape(document.getElementById("dropdown_text").value);

    document.getElementById("dropdown_new").disabled = 
	(name_exists(name) || name == "");
}

// this function replaces the green triangle by a red dot in the start
// button to indicate that the current version has not been saved yet
function check_savestate(clean) {
    if(clean) {
	// if clean is true, then this sure is a saved version
	// and we store the code for reference
	Code.current_code = Blockly.Python.workspaceToCode(Code.workspace);
	unsaved = false  // this sure is saved
    } else {
	code = Blockly.Python.workspaceToCode(Code.workspace);
	unsaved = code != Code.current_code;
    }

    // restart auto save timer while user is still editing. Save once he's stopped
    // editing for at least 5 seconds
    if(unsaved)
	on_autosave_timeout();
    
    if(Code.unsaved == unsaved) {
	// unsaved flag hasn't changed
	return;
    }

    var blocks = Code.workspace.getTopBlocks();
    var icon = unsaved?"icon_unsaved.svg":"icon_start.svg";
    var tooltip = MSG['blockStartToolTip'];
    if(unsaved) tooltip += MSG['blockStartToolTipUnsaved'];

    if(blocks.length >= 1) {
	for(var i=0;i<blocks.length;i++) {
	    if(blocks[i].type == "start") {
		blocks[i].inputList[0].fieldRow[0].setValue(icon);
		blocks[i].setTooltip(tooltip);
	    }
	}
    }

    Code.unsaved = unsaved;
}

var on_autosave_timeout = debounce(function() {
    save_blockly();
}, 10000);

function workspace_start() {
    // create a new program
    Blockly.Events.disable();
    Code.workspace.clear();
    Blockly.Events.enable();

    document.title = "Brickly: " + htmlDecode(Code.program_name[1]); 

    // an empty workspace with only the start bloick
    xml_text = '<xml xmlns="http://www.w3.org/1999/xhtml"><block type="start" id="' + 
	Blockly.utils.genUid()+'" x="10" y="20"></block></xml>'

    // alternally use this to add the start block:
    // Code.workspace.addTopBlock()

    // add the "start" block
    xml = Blockly.Xml.textToDom(xml_text);
    Blockly.Xml.domToWorkspace(xml, Code.workspace);

    // everything is saved
    check_savestate(true)

    // center if scrolling is enabled
    Code.workspace.scrollCenter();
}

function menu_file_new() {
    // now find an unused file name in the list
    var fname = null;
    for(var i = 0; i < 64; i++) {
	var tmp = "brickly-" + i + ".xml";
	if(!file_exists(tmp)) {
	    fname = tmp;
	    break;
	}
    }

    // TODO: prevent this from happening by disabling the new button
    // after 64 files
    if(!fname) {
	alert("Too many files!");
	return;
    }

    // fname is now a valid and unused filename
 
    Code.program_name = [ fname, htmlEscape(document.getElementById("dropdown_text").value) ];

    // create a new program
    workspace_start();

    menu_update();
}

function menu_file_load(fname, name) {
    Code.program_name = [ fname, htmlEscape(name) ]; // set the new file name
    document.title = "Brickly: " + htmlDecode(Code.program_name[1]);
    menu_update();                           // redo menu to highlight the newly loaded file
    program_load(USER_FILES + fname);        // and finally load the file

    // save on TXT that this is now the program
    Code.ws.send(JSON.stringify( { program_name: Code.program_name } ));
    Code.ws.send(JSON.stringify( { command: "save_settings" } ));

    // request new list as the previously active program may have been deleted
    Code.ws.send(JSON.stringify( { command: "list_program_files" } ));
}

function menu_create_entry(a) {
    var cl = ""
    var ar = ""

    if(a[0] == Code.program_name[0]) 
	// if this entry is for the current program then make it inactive and hightlight it
	cl = 'class="dropdown_selected dropdown_not_active" '
    else {
	// othewise make it trigger an event (escape ticks in the program name)
	ar = 'onclick="menu_file_load(\'' + a[0] + '\',\'' + a[1].replace("\&#39;", "\\\&#39;") + '\')"'
    }
    
    // make sure name doesn't wrap
    var name = a[1].replace(/ /g, '&nbsp;');
    return '<td align="center"><a ' +  cl + ar + '>' + name + "</a></td>";
}

/* add files to the menu */
function menu_append_files(f) {
    var loc_f = f;

    content_files = document.getElementById("dropdown_content_files");

    // check if current file exists in list and
    // append it if not. Thus programs not yet saved in TXT side
    // will show up in the menu
    if(!file_exists(Code.program_name[0]))
	loc_f.push(Code.program_name)
    
    // determine number of columns for a square setup
    cols = Math.floor(1+Math.sqrt(loc_f.length-1));
    // limit number of columns
    // if(cols > 3) cols = 3;

    // remove all existing files
    rows = Math.floor(((loc_f.length-1)/cols)+1)

    var i;
    var new_content_files = "";

    // the files come as an array of arrays
    for(i = 0; i < loc_f.length; i++) {
	// first column?
	if((i % cols) == 0) new_content_files += "<tr>";
	    
	new_content_files += menu_create_entry(loc_f[i]);

	if((i % cols) == (cols-1)) new_content_files += "</tr>";
    }

    // fill up last row
    for( ; i < cols*rows; i++) {
	if((i % cols) == 0) new_content_files += "<tr>";
	new_content_files += "<td></td>";
	if((i % cols) == (cols-1)) new_content_files += "</tr>";
    }

    content_files.innerHTML = new_content_files;
}

// Close the dropdown menu if the user clicks outside of it
window.onclick = function(event) {
    if(!event.target.classList.contains('dropdown-keep-open')) 
	menu_close();
}

function init() {
    // do various global initialization
    Blockly.Blocks.logic.HUE = 43;      // TXT orange
    Blockly.Blocks.texts.HUE = 350;       // red
    //Blockly.Blocks.colour.HUE = 20;
    //Blockly.Blocks.lists.HUE = 260;
    //Blockly.Blocks.logic.HUE = 210;
    //Blockly.Blocks.loops.HUE = 120;
    Blockly.Blocks.math.HUE = 240;
    //Blockly.Blocks.procedures.HUE = 290;
    //Blockly.Blocks.variables.HUE = 330;

    Blockly.HSV_SATURATION = 0.7;   // global saturation
    Blockly.HSV_VALUE = 0.6;        // global brightness

    Blockly.BlockSvg.START_HAT = true;

    Blockly.FieldAngle.CLOCKWISE = true;
    Blockly.FieldAngle.OFFSET = 90;
   
    // enable/disable the speed control
    if(Code.skill > 1)	document.getElementById("speed_range").value = Code.speed;
    else                document.getElementById("speed").style.display = "none";

    // below skill level 3 hide the menu
    if(Code.skill <= 2) document.getElementById("dropdown").style.display = "none";    

    // initially disable the dropdown menu
    menu_disable(true);

    custom_blocks_init();

    // load the toolbox xml
    loadToolbox(Code.skill);

    // load the manifest to display the version number in the bottom left
    // screen corner
    loadManifest()
}

// ===================================== plugin handling ======================================

function pluginsDone() {
    // fixme: this must not happen before screen resizing is done
    setTimeout(function() { program_load( USER_FILES + Code.program_name[0] ) }, 100); 
}

function loadPluginList() {
    var http = new XMLHttpRequest();
    http.open("GET", "plugins/plugins.list?random="+new Date().getTime());
    http.setRequestHeader("Content-type", "text/plain");
    http.onreadystatechange = function() {
        if (http.readyState == XMLHttpRequest.DONE) {
            if (http.status == 200) {
		// find a line starting with "version:" and display its contents
		// in the vesion div
		lines = http.responseText.split('\n')
		// iterate ober all lines
		for(var i = 0;i < lines.length;i++) {
		    // everything behind semicolon is a comment
		    line = lines[i].split(';')[0].trim()
		    Code.plugins[line] = { }
		}

		// trigger downloads of the javascript side of the plugins
		for (var key in Code.plugins) 
		    if (Code.plugins.hasOwnProperty(key)) 
			loadPlugin(key);

		// if no pluginbs are to be loaded we are done loading them ...
		if(Object.keys(Code.plugins).length == 0)
		    pluginsDone()
		
	    } else {
		// plugins list download failed. consider done with plugins
		pluginsDone()
	    }
	}
    }
    http.send();
}

function pluginsCheckDone() {
    var ok = true;

    // check for any plugin that's not flagged "complete"
    for(var i in Code.plugins)
	if( ! ("complete" in Code.plugins[i]) )
	    ok = false;

    if(ok)
	pluginsDone();
}

function pluginInstallCode(dom) {
    // the code itself is a text node
    
    // search through existing toolbox for matching category
    for (var i = 0; i < dom.childNodes.length; i++) {
	var xmlChild = dom.childNodes[i];
	if(xmlChild.nodeName == "#text") {
	    eval(xmlChild.nodeValue);
	}
    }
}

function pluginInstallBlock(plugin, dom) {
    ltype = dom.getAttribute('type');
    type = "plugin:"+plugin+":"+ltype;

    if(type) {
	Code.plugins[plugin][ltype] = { }

	// get json description inside
	for (var i = 0; i < dom.childNodes.length; i++) {
	    child = dom.childNodes[i]
	    if(child.nodeName.toLowerCase() == "json") {
		Code.plugins[plugin][ltype]["json"] = JSON.parse(child.childNodes[0].nodeValue);

		// block generation
		Blockly.Blocks[type] = {
		    init: function() {
			this.jsonInit( Code.plugins[this.type.split(":")[1]][this.type.split(":")[2]]["json"] );
		    }
		};
	    }

	    if(child.nodeName.toLowerCase() == "generate") {
		gen = child.childNodes[0].nodeValue;
		Blockly.Python[type] = Function("block", gen);
	    }
	}
    }
    return type.split(":")[2];
}

function pluginInstallBlocks(plugin, dom) {
    // install all blocks
    blocks = []
    for (var i = 0; i < dom.childNodes.length; i++) 
	if(dom.childNodes[i].nodeName.toLowerCase() == "block") 
	    blocks.push(pluginInstallBlock(plugin, dom.childNodes[i]));

    return blocks;
}

function pluginTypeExpand(plugin, blocks, dom) {
    for (var i = 0; i < dom.childNodes.length; i++) {
	child = dom.childNodes[i];
	if(child.nodeName.toLowerCase() == "block") {
	    type = child.getAttribute('type');
	    // check if it's the type of a local block
	    if(blocks.includes(type)) {
		child.setAttribute("type", "plugin:"+plugin+":"+type);
	    }
	}
	if(child.nodeName.toLowerCase() == "category") {
	    pluginTypeExpand(plugin, blocks, child);
	}
    }
}

function pluginInstallToolbox(plugin, blocks, dom) {
    // install toolbox		
    if(dom.nodeName.toLowerCase() == 'toolbox') {
	if(dom.getAttribute('type'))
	    plugin_category = dom.getAttribute('type')

	// walk over dom and expand block types of plugins own blocks
	// from "<blockname>" to "plugin:<pluginname>:<blockname>"
	pluginTypeExpand(plugin, blocks, dom);

	// search through existing toolbox for matching category
	for (var i = 0; i < Code.toolbox.childNodes.length; i++) {
	    var xmlChild = Code.toolbox.childNodes[i];

	    // integrate plugins dom into toolbox if matching category was found
	    if((xmlChild.nodeName.toLowerCase() == 'category') &&
	       (xmlChild.getAttribute('plugins') == plugin_category)) {
	    
		// move all childnodes to toolbox
		while(dom.childNodes.length > 0)
		    xmlChild.appendChild(dom.childNodes[0]);
	    
		Code.workspace.updateToolbox(Code.toolbox);
	    }
	}
    }
}

function pluginGetTranslations(dom) {
    dict = { }
    
    // read all translations into a dict
    for (var i = 0; i < dom.childNodes.length; i++) {
	var child = dom.childNodes[i];
	if(child.nodeName == "text") 
	    if(child.getAttribute('id')) 
		dict[child.getAttribute('id')] = child.childNodes[0].nodeValue;
    }
    
    return dict;
}

function loadPlugin(plugin) {
    var http = new XMLHttpRequest();
    http.open("GET", "plugins/" + plugin + ".xml?random="+new Date().getTime());
    http.setRequestHeader("Content-type", "text/plain");
    http.onreadystatechange = function() {
        if (http.readyState == XMLHttpRequest.DONE) {
            if (http.status == 200) {
		// get plugin category from xml, use "custom" if none is given
		plugin_category = "custom"
		dom = Blockly.Xml.textToDom(http.responseText);
		Code.plugin = plugin

		// root element should be "plugin"
		if(dom.nodeName.toLowerCase() == 'plugin') {

		    // try to get translations for current language
		    translations = null
		    for (var i = 0; i < dom.childNodes.length; i++)
			if((dom.childNodes[i].nodeName.toLowerCase() == "translations") && 
			   (dom.childNodes[i].getAttribute('lang') == Code.lang))
			    translations = pluginGetTranslations(dom.childNodes[i]);

		    // fallback to english translations
		    if(!translations)
			for (var i = 0; i < dom.childNodes.length; i++)
			    if((dom.childNodes[i].nodeName.toLowerCase() == "translations") && 
			       (dom.childNodes[i].getAttribute('lang') == 'en'))
				translations = pluginGetTranslations(dom.childNodes[i]);

		    if(translations) {
			// apply previously loaded translations
			text = http.responseText.replace(/{{(\w+)}}/g,
					 function(m, p1) { return translations[p1]});
			dom = Blockly.Xml.textToDom(text);

			// then load code,
			for (var i = 0; i < dom.childNodes.length; i++) 
			    if(dom.childNodes[i].nodeName.toLowerCase() == "code")
				pluginInstallCode(dom.childNodes[i]);

			// blocks, and
			var blocks = []
			for (var i = 0; i < dom.childNodes.length; i++) 
			    if(dom.childNodes[i].nodeName.toLowerCase() == "blocks")
				blocks = blocks.concat(pluginInstallBlocks(plugin, dom.childNodes[i]));

			// finally extend toolbox
			for (var i = 0; i < dom.childNodes.length; i++) {
			    if(dom.childNodes[i].nodeName.toLowerCase() == "toolbox")
				pluginInstallToolbox(plugin, blocks, dom.childNodes[i]);
			}
		    }
		}

		// mark plugin as fully loaded
		Code.plugins[plugin]["complete"] = true;
	    } else {
		// downloading xml for this plugin failed. remove it
		// from dictionary
		delete Code.plugins[plugin];
	    }	    
	    pluginsCheckDone();
	}
    }
    http.send();
}
    
function loadManifest() {
    var http = new XMLHttpRequest();
    http.open("GET", "manifest?random="+new Date().getTime());
    http.setRequestHeader("Content-type", "text/plain");
    http.onreadystatechange = function() {
        if (http.readyState == XMLHttpRequest.DONE) {
            if (http.status == 200) {
		// find a line starting with "version:" and display its contents
		// in the vesion div
		lines = http.responseText.split('\n')
		for(var i = 0;i < lines.length;i++) {
		    parts = lines[i].split(':')
		    if(parts.length == 2) {
			if(parts[0].trim().toLowerCase() == "version") 
			    document.getElementById("version").innerHTML = "V" + parts[1].trim();
		    }
		}		
	    }
	}
    }
    http.send();
}

function loadToolbox(skill_level) {
    var toolbox_name = "toolbox";
    if(skill_level) toolbox_name += "-" + skill_level.toString();

    var http = new XMLHttpRequest();
    http.open("GET", toolbox_name+".xml?random="+new Date().getTime());
    http.setRequestHeader("Content-type", "application/xml");
    http.onreadystatechange = function() {
        if (http.readyState == XMLHttpRequest.DONE) {
            if (http.status == 200)
		toolbox_install(http.responseText);
	    else if(skill_level)
		loadToolbox();
	}
    }
    http.send();
}

function onWorkspaceChange(event) {
    // user has changed the workspace. This has potentially
    // make the current state unsaved
    check_savestate(false)

    // check if the user is trying to create additional start blocks
    // and prevent that. We could tell blockly not to do that by
    // settings the start block to "undeletable". But then we couldn't
    // delete the entire program by deleting the start block
    if(event.type == Blockly.Events.CREATE) {
	var start_blocks = 0;
	// check the current workspace for start blocks
	var blocks = Code.workspace.getTopBlocks();
	if(blocks.length >= 1)
	    for(var i=0;i<blocks.length;i++)
		if(blocks[i].type == "start")
		    start_blocks++;

	if(start_blocks > 1) {
	    // this will trigger a delete event for the additional start
	    // block. So we disable events for this
	    Blockly.Events.disable();
	    Code.workspace.undo(false);
	    Blockly.Events.enable();
	}
    }

    // a program is deleted by deleting the stack with the start block
    // on top. This only works if the TXT is connected
    if((event.type == Blockly.Events.DELETE) &&
       (event.oldXml.getAttribute("type") == "start")) {
	if(!Code.connected || (!confirm(MSG['confirm_delete'].replace("%1", 
                  htmlDecode(Code.program_name[1]))))) {

	    if(!Code.connected)
		alert(MSG['delete_not_connected'])

	    // undo delete
	    Blockly.Events.disable();
	    Code.workspace.undo(false);
	    Blockly.Events.enable();

	    return;
	}
	
	// make sure the current program is set on TXT side ...
	Code.ws.send(JSON.stringify( { program_name: Code.program_name } ));
	
	// ... then delete it ...
	Code.ws.send(JSON.stringify( { command: "delete" } ));
	
	// ... and finally update file list
	Code.ws.send(JSON.stringify( { command: "list_program_files" } ));
	
	// disable the run button
	button_run_enable(false);

	workspace_start();
    }
    
    // enable the run button once the first block has been added
    // and once the txt is connected
    if((event.type == Blockly.Events.CREATE) &&
       (Code.workspace.getAllBlocks().length >= 1))
	button_run_enable(true);
}
    
function toolbox_install(toolboxText) {
    // Interpolate translated messages into toolbox.
    toolboxText = toolboxText.replace(/{(\w+)}/g,
				      function(m, p1) {return MSG[p1]});

    set_skill_tooltips();

    Code.toolbox = Blockly.Xml.textToDom(toolboxText);
    Code.workspace = Blockly.inject('blocklyDiv',
				    { media: 'blockly/media/',
				      toolbox: Code.toolbox,
				      // scrollbars: false,  // 
				      zoom: { // controls: true,
					  wheel: true,
					  // startScale: 1.0,
					  maxScale: 2,
					  minScale: 0.5,
					  scaleSpeed: 2
				      }
				    } );

    // disable and enable run button depending on workspace being used
    // and delete program if all blocks are deleted
    Code.workspace.addChangeListener(onWorkspaceChange);

    // don't allow orphaned stacks
    Code.workspace.addChangeListener(Blockly.Events.disableOrphans);
    
    button_set('run', false);
    display_state(MSG['stateDisconnected']);

    window.addEventListener('resize', onresize, false);
    onresize();
	
    // try to connect web socket right away
    ws_start(true);

    // try to load any plugins
    loadPluginList();
}

function set_skill_tooltips() {
    for (var i = 1; i <= 5; i++) { 
	var obj = document.getElementById("skill-"+i.toString());
	obj.title = MSG['skillToolTip'].replace('%1',MSG['skill'+i.toString()]);
	if(i==Code.skill) obj.setAttribute("data-selected", "true");
    }
}

function speed_change(value) {
    Code.speed = value;
    if (typeof Code.ws !== 'undefined') 
	Code.ws.send(JSON.stringify( { speed: Code.speed } ));
}

function get_parm(name, current) {
  var val = location.search.match(new RegExp('[?&]'+name+'=([^&]+)'));
  return val ? decodeURIComponent(val[1].replace(/\+/g, '%20')) : current;
}
    
function set_search_parm(search, name, val) {
    if (search.length <= 1) {
	search = '?'+name+'=' + val;
    } else if (search.match(new RegExp('[?&]'+name+'=[^&]*'))) {
	search = search.replace(new RegExp('([?&]'+name+'=)[^&]*'), '$1'+val);
    } else {
	search = search.replace(/\?/, '?'+name+'='+val+'&');
    }
    return search
}

function set_parm(name, newVal, curVal) {
    // don't do anything if the value hasn't changed
    if(newVal != curVal) {
	search = set_search_parm(window.location.search, name, newVal)

	// add program name and file name
	search = set_search_parm(search, "name", encodeURIComponent(Code.program_name[0]))
	search = set_search_parm(search, "file", encodeURIComponent(Code.program_name[1]))

	window.location = window.location.protocol + '//' +
	    window.location.host + window.location.pathname + search;
    }
}

function display_state(str) {
    // document.getElementById("stateDiv").innerHTML = str;
}

// the run button may only be enabled if there's at least
// one block in the workspace
function button_run_enable(enable) {
    // if button is in "run" mode enable and disable
    // it immediately
    but = document.getElementById("button");
    but.run_enabled = enable;

    // if the button is currently in "run mode" (and not "stopp")
    // and we are connected then disable and enable it immediately
    if(but.run_mode && Code.connected)
	but.disabled = !enable;
}

// switch between "Run..." and "Stop!" button
function button_set(state, enable) {
    but = document.getElementById("button");
    but.disabled = !enable;
    but.run_mode = state == 'run';
    if(state == 'run') {
        but.innerHTML = MSG['buttonRun'];
        but.onclick = program_run;

	// if run is not enabled (workspace is empty)
	// then keep button disabled
	if(enable && !but.run_enabled)
	    but.disabled = true;
    } else if(state == 'stop') {
        but.innerHTML = MSG['buttonStop'];
        but.onclick = program_stop;
    } else if(state == 'connect') {
        but.innerHTML = MSG['buttonConnect'];
        but.onclick = txt_connect;
    } else
	console.log("Illegal button state")
}

// htmlize text received from the code before it's being
// put into a text output
function html_escape(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;') 
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// display some text output by the code
function display_text(str) {
    // keep a scrollback buffer

    if (typeof Code.text_buffer === 'undefined') {
	// initial state: empty array
	Code.text_buffer = [ "" ]
    }
    
    lines = str.split('\n')
    if(lines.length > 0) {
	// append first line to the last line of the buffer
	Code.text_buffer[Code.text_buffer.length - 1] += lines[0]
	
	// create buffer entries for further lines
	if(lines.length > 1)
	    for(var i=1;i<lines.length; i++) 
		Code.text_buffer[Code.text_buffer.length] = lines[i];
    }

    // limit the total number of lines in the buffer
    while(Code.text_buffer.length > MAX_TEXT_LINES)
	Code.text_buffer.shift();

    var objDiv = document.getElementById("textDiv");

    // build a html representation of the buffer
    s = ""
    for(var i in Code.text_buffer)
	s += Code.text_buffer[i] + "<br />";

    objDiv.innerHTML = s;
    objDiv.scrollTop = objDiv.scrollHeight;
}

// clear the text area
function display_text_clr() {
    Code.text_buffer = [ "" ]
    document.getElementById("textDiv").innerHTML = "";
}

// start the websocket server
function ws_start(initial) {
    url = "ws://"+document.location.hostname+":9002/";
    
    Code.ws = new WebSocket(url);
    Code.connected = false;
    
    Code.ws.onmessage = function(evt) {
	// ignore empty messages
	if(evt.data.length) {
	    // console.log("MSG:" + evt.data)

            // the message is json encoded
            obj = JSON.parse(evt.data);

	    // handle the various json values

	    // commands from client
	    if(typeof obj.gui_cmd !== 'undefined') {
		if(obj.gui_cmd == "clear") display_text_clr();
		if(obj.gui_cmd == "run") {
		    display_state(MSG['stateRunning']);
		    button_set('stop', true);
		}
	    }

	    if(typeof obj.text_color !== 'undefined') {
		display_text("<font color='" + obj.text_color[0] + "'>" + obj.text_color[1] + "</font>");
	    }

	    if(typeof obj.program_files !== 'undefined') {
		Code.files = obj.program_files;
		menu_update();
	    }

	    if(typeof obj.running !== 'undefined') {
		if(obj.running) {
		    // client informs us after a connect that there's code being
		    // executed
		    display_state(MSG['stateRunning']);
		    button_set('stop', true);		
		}
	    }

            if(typeof obj.stdout !== 'undefined') 
		display_text(html_escape(obj.stdout));

            if(typeof obj.stderr !== 'undefined')
		display_text("<font color='red'><tt><b>"+
			     html_escape(obj.stderr)+"</b></tt></font>");

	    if(typeof obj.highlight !== 'undefined') {
		if(obj.highlight == "none") {
		    display_state(MSG['stateProgramEnded']);
		    Code.workspace.highlightBlock();
		    button_set('run', true);
		} else
		    Code.workspace.highlightBlock(obj.highlight);
	    }
	}
    };
    
    Code.ws.onopen = function(evt) {
	// update GUI to reflect the connected state
        Code.connected = true;
        button_set('run', true);
	display_state(MSG['stateConnected']);
	
	// request list of program files stored on TXT
	Code.ws.send(JSON.stringify( { command: "list_program_files" } ));

	// the spinner may still be there from the launch request
	spinner_stop();
    };
    
    Code.ws.onerror = function(evt) {
    };
    
    Code.ws.onclose = function(evt) {
        // retry if we never were successfully connected
        if(!Code.connected) {
            //try to reconnect in 10ms
	    if(!initial) {
		setTimeout(function(){ ws_start(false) }, 100);
	    } else {
		// show the connect button
		button_set('connect', true);
		txt_connect();
	    }
        } else {
	    // connection lost
            display_state(MSG['stateDisconnected']);
            Code.connected = false;
            // button_set('run', false);
            button_set('connect', true);
	    Code.workspace.highlightBlock();
	    menu_disable(true);
	    delete Code.ws;
        }
    };
};

function program_stop() {
    button_set('stop', false);
    Code.ws.send(JSON.stringify( { command: "stop" } ));
}

function program_load(name) {
    var http = new XMLHttpRequest();
    http.open("GET",  name + "?random="+new Date().getTime());
    http.setRequestHeader("Content-type", "application/xml");
    http.onreadystatechange = function() {
        if (http.readyState == XMLHttpRequest.DONE) {
	    // clearing the workspace should not trigger any "really delete?"
	    // request 
	    Blockly.Events.disable();
	    Code.workspace.clear();
	    Blockly.Events.enable();

            if (http.status == 200) {
		var min_x = Number.POSITIVE_INFINITY;
		var min_y = Number.POSITIVE_INFINITY;

		var start_found = false;
		var xml = Blockly.Xml.textToDom(http.responseText);

		// try to find settings in dom
		for (var i = 0; i < xml.childNodes.length; i++) {
		    var xmlChild = xml.childNodes[i];
		    var name = xmlChild.nodeName.toLowerCase();
		    if (name == 'settings') {
			var speed = parseInt(xmlChild.getAttribute('speed'), NaN);
			if((speed >= 0) && (speed <= 100)) {
			    Code.speed = speed
			    document.getElementById("speed_range").value = Code.speed;
			}
		    }

		    // change the origin of the root blocks
		    // find the minimum x and y coordinates used
		    if (name == 'block') {
			// does this program already have a "start" block?
			if(xmlChild.getAttribute('type') == "start")
			    start_found = true;
			
			if(min_x > parseInt(xmlChild.getAttribute('x')))  
			    min_x = parseInt(xmlChild.getAttribute('x'));
			if(min_y > parseInt(xmlChild.getAttribute('y')))
			    min_y = parseInt(xmlChild.getAttribute('y'));
		    }
		}

		// make sure top/left corner is at (10,10)
		for (var i = 0; i < xml.childNodes.length; i++) {
		    var xmlChild = xml.childNodes[i];
		    var name = xmlChild.nodeName.toLowerCase();
		    if (name == 'block') {
			xmlChild.setAttribute('x', parseInt(xmlChild.getAttribute('x')) - min_x + 10);
			xmlChild.setAttribute('y', parseInt(xmlChild.getAttribute('y')) - min_y + 20);
		    }
		}

		// --- make sure there's a start element as introduced with version 1.19 ---
		if(!start_found) {
		    // once more walk over all root nodes
		    for (var i = 0; i < xml.childNodes.length; i++) {
			var xmlChild = xml.childNodes[i];
			var name = xmlChild.nodeName.toLowerCase();

			if (name == 'block') {
			    // get type. The types of procedures all begin with procedures_
			    type = xmlChild.getAttribute('type').split('_')[0];
			    if(type != "procedures") {
				// insert a start block
				var start_block = goog.dom.createDom('block');
				start_block.setAttribute('type', 'start');
				start_block.setAttribute('id', Blockly.utils.genUid());

				// use position of block we are going to "swallow"
				start_block.setAttribute('x', xmlChild.getAttribute('x'));
				start_block.setAttribute('y', xmlChild.getAttribute('y'));
				
				xml.appendChild(start_block);

				// remove old block from root
				xml.removeChild(xmlChild);
				// remove old blocks coordinates 
				xmlChild.removeAttribute('x');
				xmlChild.removeAttribute('y');
				
				// create a new next block
				var next = goog.dom.createDom('next');
				start_block.appendChild(next);

				// and append it to the next element of the new start block
				next.appendChild(xmlChild);

				break;
			    }
			}
		    }
		}

		// make sure the file loading is not considered "editing"
		Blockly.Xml.domToWorkspace(xml, Code.workspace);

		// everything is saved
		check_savestate(true)
            } else {
		// could not load program. Make sure the
		// default start block is there
		workspace_start();
	    }

	    // center if scrolling is enabled
	    Code.workspace.scrollCenter();
        }
    }
    http.send();
}

/* ------------------------- busy spinner of top of the text window --------------------------*/
/* the spinner is shown when the app is being launched as this takes some time */
function spinner_start() {
    if(!Code.spinner) {
	var objDiv = document.getElementById("textArea");
	Code.spinner = new Spinner({top:"0%", position:"relative", color: '#fff'}).spin(objDiv)
    }
}

function spinner_stop() {
    if(Code.spinner) {
	Code.spinner.stop();
	Code.spinner = null;
    }
}

function save_blockly() {
    // cannot do this if we aren't connected
    if(!Code.connected) return;

    // set current program name
    Code.ws.send(JSON.stringify( { program_name: Code.program_name } ));

    // generate xml and post it with the python code
    var blockly_dom = Blockly.Xml.workspaceToDom(Code.workspace);

    // insert settings (speed) into xml
    var settings = goog.dom.createDom('settings');
    settings.setAttribute('speed', Code.speed);
    settings.setAttribute('name', Code.program_name[1]);
    blockly_dom.appendChild(settings)
	
    var blockly_code = Blockly.Xml.domToText(blockly_dom);

    Code.ws.send(JSON.stringify( { blockly_code: blockly_code } ));

    check_savestate(true)
}

function program_run() {
    // cannot do this if we aren't connected
    if(!Code.connected) return;

    // add highlight information to the code. Make it commented so the code
    // will run on any python setup. If highlighting is wanted these lines
    // need to be uncommented on server side
    Blockly.Python.STATEMENT_PREFIX = '# highlightBlock(%1)\n';
    Blockly.Python.addReservedWords('wrapper');

    // Generate Python code and POST it
    var python_code = Blockly.Python.workspaceToCode(Code.workspace);

    // preprend current speed settings
    python_code = "# speed = " + Code.speed.toString() + "\n" + python_code;

    // set current program name
    Code.ws.send(JSON.stringify( { program_name: Code.program_name } ));

    // send various parameters
    Code.ws.send(JSON.stringify( { speed: Code.speed } ));
    Code.ws.send(JSON.stringify( { skill: Code.skill } ));
    Code.ws.send(JSON.stringify( { lang: Code.lang } ));
    Code.ws.send(JSON.stringify( { command: "save_settings" } ));

    // send python and blockly version of the current code
    Code.ws.send(JSON.stringify( { python_code: python_code } ));
    save_blockly();

    // and finally request app to be started
    Code.ws.send(JSON.stringify( { command: "run" } ));

    // enable button and make it a "stop!" button
    button_set('stop', true);

    // request list of program files stored on TXT as it may have changed
    Code.ws.send(JSON.stringify( { command: "list_program_files" } ));
}
    
function txt_connect() {
    if(!Code.connected) {
	
	// if we aren't connected then we need to start the brickly app on the TXT
	// first. This is done by posting the code
	
	button_set('run', false);
        display_state(MSG['stateConnecting']);

	spinner_start();

	var http = new XMLHttpRequest();
	http.open("GET", "./brickly_launch.py");
	// http.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
	http.onreadystatechange = function() {
	    if (http.readyState == XMLHttpRequest.DONE) {
		if (http.status != 200) {
		    alert("Error " + http.status + "\n" + http.statusText);
		    spinner.stop();
		} else
		    ws_start(false);
	    }
	}
	http.send();
    }
}

function resizeTo(element_name, target_name) {
    var element = document.getElementById(element_name);
    var target = document.getElementById(target_name);

    // Compute the absolute coordinates and dimensions of source
    var r_element = element;
    var x = 0;
    var y = 0;
    do {
        x += element.offsetLeft;
        y += element.offsetTop;
        element = element.offsetParent;
    } while (element);

    // Position blocklyDiv over blocklyArea.
    target.style.left = x + 'px';
    target.style.top = y + 'px';
    target.style.width = r_element.offsetWidth + 'px';
    target.style.height = r_element.offsetHeight + 'px';
}

// Returns a function, that, as long as it continues to be invoked, will not
// be triggered. The function will be called after it stops being called for
// N milliseconds. If `immediate` is passed, trigger the function on the
// leading edge, instead of the trailing.
function debounce(func, wait, immediate) {
    var timeout;
    return function() {
	var context = this, args = arguments;
	var later = function() {
	    timeout = null;
	    if (!immediate) func.apply(context, args);
	};
	var callNow = immediate && !timeout;
	clearTimeout(timeout);
	timeout = setTimeout(later, wait);
	if (callNow) func.apply(context, args);
    };
};

var onresize = debounce(function() {
    resizeTo('blocklyArea', 'blocklyDiv');
    resizeTo('textArea', 'textDiv');
    Blockly.svgResize(Code.workspace);
}, 50);

// ----------------- verify settings read from settings.js -----------

// "lang" is set in settings.js
// language may not be set by now. Use english as default then
if (typeof lang !== 'undefined') Code.lang = lang;
// and try to override from url
Code.lang = get_parm("lang", Code.lang);

// default skill is 1
if (typeof skill !== 'undefined') Code.skill = skill;
// try to override from url
Code.skill = parseInt(get_parm("skill", Code.skill));

// the settings may also contain info about the name of
// the last program used
if((typeof program_name !== 'undefined')&&
   (typeof program_file_name !== 'undefined'))
    Code.program_name = [ program_file_name, program_name ]

// get program name/file from url
Code.program_name = [
    get_parm("name", Code.program_name[0]),
    get_parm("file", Code.program_name[1])
]

document.title = "Brickly: " + htmlDecode(Code.program_name[1]);
document.head.parentElement.setAttribute('lang', Code.lang);
document.head.parentElement.setAttribute('skill', Code.skill);
document.head.parentElement.setAttribute('name', Code.program_name[0]);
document.head.parentElement.setAttribute('file', Code.program_name[1]);
document.write('<script src="blockly/' + Code.lang + '.js"></script>\n');
document.write('<script src="' + Code.lang + '.js"></script>\n');
window.addEventListener('load', init);
