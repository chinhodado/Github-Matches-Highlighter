// ==UserScript==
// @name         github_highlight_matches
// @version      0.2
// @description  Highlight all matches of the clicked on word in the Github code viewer
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
        
        var n, allTextNodes = [], walk = document.createTreeWalker(codeContent, NodeFilter.SHOW_TEXT, null, false);
        while (n = walk.nextNode()) {
            allTextNodes.push(n);
        }
        
        for (var i = 0; i < allTextNodes.length; i++) {
            var n = allTextNodes[i];
            var replaceNodes = processTextNode(n, t);
            var parentNode = n.parentNode;
            parentNode.replaceChild(replaceNodes[replaceNodes.length - 1], n);
            var referenceElement = replaceNodes[replaceNodes.length - 1];
            for (var k = 0; k < replaceNodes.length - 1; k++) {
                parentNode.insertBefore(replaceNodes[k], referenceElement);
            }
        }
        
        codeContent.normalize();
        
        console.log("\"" + t + "\"");
    }
}

function processTextNode(textNode, toFind) {
    var text = textNode.textContent;
    var nodes = [];
    var indexLeft = text.indexOf(toFind); 
    if (indexLeft != -1) {
        if (indexLeft > 0) {
            // process left node
            var leftText = text.substring(0, indexLeft);
            nodes.push(document.createTextNode(leftText));
        }
        
        var span = document.createElement('span');
        span.innerHTML = toFind;
        span.className = "match_highlighted";
        span.style.backgroundColor = "rgba(253, 255, 0, 0.28)";
        nodes.push(span);
        
        if (indexLeft + toFind.length < text.length) {
            // todo: process the right part properly
            var rightText = text.substring(indexLeft + toFind.length);
            nodes.push(document.createTextNode(rightText));
        }
    }
    else {
        nodes.push(textNode);
    }
    
    return nodes;
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
