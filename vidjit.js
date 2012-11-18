var Vidjit = (function() {
	//Just a reminder: "In" means: (local) video data coming IN to BE STREAMED, "Out" means received data to be OUTPUT to something.
	
    var threshold = 0.5;
    var width = 0, height = 0;
    var segmentWidth = 100, segmentHeight = 100, nSegments = (width / segmentWidth) * (height / segmentHeight);
    var lastFrameAvgs = new Array();
    var canvasInContext = null, canvasOutContext;
    var canvas = null;
    var inputElem = null, outputElem = null, socketInstance;
    
// Internal helper functions

	var calcPartialAvg = function(buffer, fromIndex, toIndex) {
		var sum = 0;
		var len = toIndex - fromIndex;
		for(var i=fromIndex; i<toIndex; i++) sum += buffer[i];
		return sum / len;
	}

	var compressImgDataPartial = function(buffer,w,h) {
	  var stringBuffer = "";
	  //This construction makes sure we're only compressing RGB, not the Alpha channel of RGBA information.
	  for(var y = 0; y < h; y++) {
		for(var x = 0; x < w; x++) {
		  for(var i=0; i < 3; i++) {
			stringBuffer += String.fromCharCode(buffer[i + (4 * y * w) + (x * 4)]);					
		  }
		}
	  }
	  return Vidjit.LZW.compress(stringBuffer);
	}

	var videoCallback = function() {
		canvasInContext.drawImage(inputElem, 0, 0, width, height);
		
		var currentSegmentIndex = 0;
		for(var y = 0; y < height; y += segmentHeight) {
			for(var x = 0; x < width; x += segmentWidth) {
				var segmentImgData = canvasInContext.getImageData(x, y, segmentWidth, segmentHeight).data;
				var avg = calcPartialAvg(segmentImgData,0, segmentWidth * segmentHeight * 4);
				if(Math.abs(avg - lastFrameAvgs[currentSegmentIndex]) > threshold) {
					sendSegmentCallback(x,y, segmentImgData);
				}
				lastFrameAvgs[currentSegmentIndex] = avg;
				currentSegmentIndex++;
			}
		}
		
		setTimeout(videoCallback, 50);
	};
	
	var renderCompressedSegment = function(data, x, y) {
		var uncompressed = Vidjit.LZW.decompress(data, x, y);
		var imgData = canvasOutContext.getImageData(0,0,width,height);
		for(var i=0, len = uncompressed.length; i < len; i+= 3) {
			var tx = ((i/3) % segmentWidth) + x;
			var ty = Math.floor((i/3) / segmentWidth) + y;
		
			imgData.data[(ty * 400 * 4) + 4*tx] = uncompressed.charCodeAt(i);
			imgData.data[(ty * 400 * 4) + 4*tx + 1] = uncompressed.charCodeAt(i + 1);
			imgData.data[(ty * 400 * 4) + 4*tx + 2] = uncompressed.charCodeAt(i + 2);
			imgData.data[(ty * 400 * 4) + 4*tx + 3] = 0xff;
		}
		canvasOutContext.putImageData(imgData, 0, 0);
	};
			
// Exported functions

	var init = function(videoInput, canvasOutput, socket, sendCallback, receiveCallback) {
		inputElem = videoInput;
		outputElem = canvasOutput;
		socketInstance = socket;
		width = videoInput.width;
		height = videoInput.height;
        for(var i=0; i < nSegments; i++) lastFrameAvgs[i] = 0;
        
        //TODO: Make sure this works in all browsers!
        canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        
        //TODO: Make sure this works in all browsers!
        canvasInContext = canvas.getContext("2d");
        canvasOutContext = canvasOutput.getContext("2d");	
        
        if(sendCallback !== undefined) sendSegmentCallback = sendCallback;
        if(receiveCallback !== undefined) receiveSegmentCallback = receiveCallback;
	};
	
	var start = function() {
		//TODO: Make sure this works in all browsers!
    	window.navigator.webkitGetUserMedia({audio: true, video: true}, function(stream) {
        	inputElem.src = window.webkitURL.createObjectURL(stream);
            videoCallback();
        });
        
        receiveSegment();  
	};
	
    var sendSegmentCallback = function(x,y, segmentImgData) {
		socketInstance.emit("imgData", {
			"x": x, 
			"y": y, 
			img: compressImgDataPartial(segmentImgData, segmentWidth, segmentHeight)
		});    
    };
    var receiveSegmentSource = undefined;
    
	var receiveSegment = function() {
		if(receiveSegmentSource === undefined) {
			socketInstance.on('imgData', function (data) {
				renderCompressedSegment(data.img, data.x, data.y);
			});
		} else {
			data = sourceFunction();
			renderCompressedSegment(data.buffer, data.x, data.y);			
		}
	};    
	
	
// Thank's for reading the source code. Have some fun!	
	return {
		"init": init, 
		"start": start, 
		"sendSegmentCallback": sendSegmentCallback, 
		"receiveSegmentFunc": receiveSegmentSource,
		"receiveSegmentTrigger": receiveSegment
	};
}());

Vidjit.LZW = {
    compress: function (uncompressed) {
        "use strict";
        // Build the dictionary.
        var i,
            dictionary = {},
            c,
            wc,
            w = "",
            result = [],
            dictSize = 256;
        for (i = 0; i < 256; i += 1) {
            dictionary[String.fromCharCode(i)] = i;
        }
 
        for (i = 0; i < uncompressed.length; i += 1) {
            c = uncompressed.charAt(i);
            wc = w + c;
            if (dictionary[wc]) {
                w = wc;
            } else {
                result.push(dictionary[w]);
                // Add wc to the dictionary.
                dictionary[wc] = dictSize++;
                w = String(c);
            }
        }
 
        // Output the code for w.
        if (w !== "") {
            result.push(dictionary[w]);
        }
        return result;
    },
 
 
    decompress: function (compressed) {
        "use strict";
        // Build the dictionary.
        var i,
            dictionary = [],
            w,
            result,
            k,
            entry = "",
            dictSize = 256;
        for (i = 0; i < 256; i += 1) {
            dictionary[i] = String.fromCharCode(i);
        }
 
        w = String.fromCharCode(compressed[0]);
        result = w;
        for (i = 1; i < compressed.length; i += 1) {
            k = compressed[i];
            if (dictionary[k]) {
                entry = dictionary[k];
            } else {
                if (k === dictSize) {
                    entry = w + w.charAt(0);
                } else {
                    return null;
                }
            }
 
            result += entry;
 
            // Add w+entry[0] to the dictionary.
            dictionary[dictSize++] = w + entry.charAt(0);
 
            w = entry;
        }
        return result;
    }
};