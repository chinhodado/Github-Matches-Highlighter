// ==UserScript==
// @name         github_highlight_matches
// @version      0.1
// @description  Highlight matches of selected word on Github
// @include      https://github.com/*
// @copyright    2014, Chin
// @run-at       document-end
// @grant        none
// ==/UserScript==

function escapeRegExp(string) {
    return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

/**
 * Highlight all matches of the clicked on word
 */
function highlightMatch() {
    var codeContent = document.getElementsByClassName('highlight js-file-line-container')[0];
    
    // revert all highlighted text back to their previous state
    var highlighted = codeContent.getElementsByClassName('match_highlighted');
    while (highlighted.length !== 0) {
        var span = highlighted[0];
    	span.parentNode.replaceChild(document.createTextNode(span.textContent), span);
    }
    
    // Gets clicked on word
    var t = '';
    
    // Webkit, Gecko
    var s = window.getSelection();
    if (s.isCollapsed) { // don't care when the user highlight text manually
        s.modify('move', 'forward', 'character');
        s.modify('move', 'backward', 'word');
        s.modify('extend', 'forward', 'word');
        t = s.toString();
        t = t.replace(/[^\w\s]/gi, '').trim();
        s.modify('move', 'forward', 'character'); //clear selection
        
        // this span with colored background will be used to replace the text
        var newSpan = "<span class='match_highlighted' style ='background-color: rgba(253, 255, 0, 0.28)'>" + t + "</span>";
        codeContent.innerHTML = codeContent.innerHTML.replace(new RegExp(escapeRegExp(t), 'g'), newSpan);
        console.log(t);
    }
}

/**
 * Try to find the code viewer and bind the onClick event to it 
 */
function tryBindOnclick() {
    var codeContent = document.getElementsByClassName('highlight js-file-line-container')[0];
    if (codeContent) {
        if (!codeContent.onclick) {
        	codeContent.onclick = highlightMatch;
        	console.log("onClick registered");
        }
    }
    else {
    	// console.log("Code viewer not found");
    }
}

// Try once after page loads
tryBindOnclick();

// This is needed since Github uses AJAX to load new page contents, so we need to constantly monitoring the page
setInterval(function() { 
    tryBindOnclick();
}, 2000);
