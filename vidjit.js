/**
* Main class for Vidjit.js
* @class Vidjit
*/
var Vidjit = (function(sock) {
	var instance = {};
	//Just a reminder: "In" means: (local) video data coming IN to BE STREAMED, "Out" means received data to be OUTPUT to something.
	
    var threshold = 0.5;
    var width = 0, height = 0;
    var segmentWidth = 100, segmentHeight = 100, nSegments = (width / segmentWidth) * (height / segmentHeight);
    var lastFrameAvgs = new Array();
    var canvasInContext = null, canvasOutContext;
    var canvas = null;
    var inputElem = null, outputElem = null, socketInstance;
    
// Internal helper functions

	/**
	* Calculates the color-by-color average of a (linear) subset of an array.
	*
	* @method calcPartialAvg
	* @private
	* @param {Array} buffer The buffer with the pixel data (format RGBARGBA....)
	* @param {Integer} first The index (first pixel is 0) to start calculating the average for
	* @param {Integer} last The index where calculation ends at 
	* @return {Integer} the average value of all pixels (color by color)
	*/
	var calcPartialAvg = function(buffer, first, last) {
		var sum = 0;
		var len = first - last;
		for(var i=first; i<=last; i++) sum += buffer[i];
		return sum / len;
	}

	/**
	* Compresses a segment of the pixel data by stripping the alpha value and converting it into a string
	* The string is then passed to Vidjit.LZW.compress to compress it.
	*
	* @method compressImgDataPartial
	* @private
	* @param {Array} buffer The buffer with the pixel data (format RGBARGBA....)
	* @param {Integer} w Width (in pixels) of the pixel data rect
	* @param {Integer} h Height (in pixels) of the pixel data rect
	* @return {String} The LZW compressed string of RGB values (as chars)
	*/
	var compressImgDataPartial = function(buffer,w,h) {
	  var stringBuffer = "";
	  for(var y = 0; y < h; y++) {
		for(var x = 0; x < w; x++) {
	  	  //This construction makes sure we're only compressing RGB, not the Alpha channel of RGBA information.
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
				var avg = calcPartialAvg(segmentImgData,0, segmentWidth * segmentHeight * 4 - 1);
				if(Math.abs(avg - lastFrameAvgs[currentSegmentIndex]) > threshold) {
					instance.sendSegmentCallback(x,y, compressImgDataPartial(segmentImgData, segmentWidth, segmentHeight));
				}
				lastFrameAvgs[currentSegmentIndex] = avg;
				currentSegmentIndex++;
			}
		}
		
		setTimeout(videoCallback, 10);
	};
	
	/**
	* Renders a compressed image segment to the output canvas
	*
	* @method renderCompressedSegment
	* @private
	* @param {String} data The string with the compressed image information
	* @param {Integer} x The x offset to draw the image segment to
	* @param {Integer} y The y offset to draw the image segment to
	*/
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

	/**
	* Initializing Vidjit.js for streaming
	* 
	* @method init
	* @param {video} videoInput The video element that is used as the image data source
	* @param {canvas} canvasOutput The canvas element that is used as output destination for displaying the received data
	* @param {Function} [sendCallback] A function that takes (x,y,compressedImgData) as parameters and sends them to the server.
						If left out, default socket.io implementation is used.
	*/
	instance.init = function(videoInput, canvasOutput, sendCallback) {
		inputElem = videoInput;
		outputElem = canvasOutput;
		socketInstance = sock.connect();
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
        
        if(sendCallback !== undefined) instance.sendSegmentCallback = sendCallback;
	};
	
	/**
	* Starts the streaming
	*
	* @method start
	**/
	instance.start = function() {
		window.URL = window.URL || window.webkitURL;
		navigator.getUserMedia  = navigator.getUserMedia || navigator.webkitGetUserMedia ||
        							navigator.mozGetUserMedia || navigator.msGetUserMedia;
                          
    	navigator.getUserMedia({audio: true, video: true}, function(stream) {
        	inputElem.src = window.URL.createObjectURL(stream);
            videoCallback();
        });
        
        instance.receiveSegment();  
	};
	
	/**
	* Callback for sending a compressed segment to the server
	* The default implementation uses socket.io for doing so.
	* 
	* @method sendSegmentCallback
	* @param {Integer} x The x offset of the segment in the whole image data
	* @param {Integer} y The y offset of the segment in the whole image data
	* @param {String} compressedSegmentImgData The compressed image data for the segment, generated internally.
	*/
    instance.sendSegmentCallback = function(x,y, compressedSegmentImgData) {
		socketInstance.emit("imgData", {
			"x": x, 
			"y": y, 
			img: compressedSegmentImgData
		});    
    };
    
    /**
    * This callback by default receives (using socket.io) a segment and renders it, when no parameters are passed
    * If you pass parameters to it, always pass all three of them. In this case the method will render the data you passed in.
    *
    * @method receiveSegment
    * @param {Integer} x The x offset to render the segment to
    * @param {Integer} y The y offset to render the segment to
    * @param {String} buffer String containing the compressed segment data to render
    */
	instance.receiveSegment = function(x, y, buffer) {
		if(x === undefined) {
			socketInstance.on('imgData', function (data) {
				renderCompressedSegment(data.img, data.x, data.y);
			});
		} else {
			renderCompressedSegment(buffer, x, y);			
		}
	};    
	
	
// Thank's for reading the source code. Have some fun!	
	return instance;
}(io));

/**
* This class provides an LZW implementation. 
* This is used by Vidjit to compress and decompress the image data that goes over the wire.
*
* @class LZW
*/
Vidjit.LZW = {
	/**
	* Compresses a string
	* 
	* @method compress
	* @param {String} uncompressed The string that needs to be compressed
	* @return {ByteArray} The compressed data as a ByteArray.
	*/
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
 
 	/**
 	* Decompresses a ByteArray to the string that has been compressed using compress() before
 	*
 	* @method decompress
 	* @param {ByteArray} compressed The ByteArray with the compressed data
 	* @return {String} The uncompressed string.
 	*/
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