// Global variables
let spritesheetImg = null;
let jsonData = null;
let imageFile = null;
let jsonFile = null;
let currentOperation = null;

// Statistics
let stats = {
    totalProcessed: parseInt(localStorage.getItem('totalProcessed') || '0'),
    totalSprites: parseInt(localStorage.getItem('totalSprites') || '0')
};

function updateStats() {
    document.getElementById('totalProcessed').textContent = stats.totalProcessed;
    document.getElementById('totalSprites').textContent = stats.totalSprites;
}

function saveStats() {
    localStorage.setItem('totalProcessed', stats.totalProcessed.toString());
    localStorage.setItem('totalSprites', stats.totalSprites.toString());
}

// Initialize particles
function createParticles() {
    const particles = document.querySelector('.particles');
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 15 + 's';
        particle.style.animationDuration = Math.random() * 10 + 10 + 's';
        particles.appendChild(particle);
    }
}

// File size formatter
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// File upload handling
function setupFileUpload(uploadArea, fileInput, statusDiv, onFileLoad) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach((eventName) => {
        uploadArea.addEventListener(eventName, () => uploadArea.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach((eventName) => {
        uploadArea.addEventListener(
            eventName,
            () => uploadArea.classList.remove('dragover'),
            false
        );
    });

    uploadArea.addEventListener('drop', handleDrop, false);
    fileInput.addEventListener('change', handleFileSelect, false);

    function handleDrop(e) {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    }

    function handleFileSelect(e) {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    }

    function handleFile(file) {
        // Check file size (50MB limit)
        if (file.size > 50 * 1024 * 1024) {
            showError(uploadArea, 'File too large! Maximum size is 50MB.');
            return;
        }

        uploadArea.classList.remove('error');
        uploadArea.classList.add('has-file', 'success-animation');
        statusDiv.classList.add('show');

        setTimeout(() => {
            uploadArea.classList.remove('success-animation');
        }, 600);

        onFileLoad(file);
    }
}
function showError(uploadArea, message) {
    uploadArea.classList.add('error');
    alert(message);
}

function showJsonError(message) {
    const errorDiv = document.getElementById('jsonError');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    document.getElementById('jsonUpload').classList.add('error');
    document.getElementById('jsonStatus').classList.remove('show');
    alert(message);
}

// Image file handler
function handleImageFile(file) {
    imageFile = file;
    document.getElementById('imageFileName').textContent =
        `${file.name} (${formatFileSize(file.size)})`;

    const reader = new FileReader();
    reader.onload = function (e) {
        const img = new Image();
        img.onload = function () {
            spritesheetImg = img;
            document.getElementById('imagePreview').src = e.target.result;
            checkFilesLoaded();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// JSON file handler
function handleJsonFile(file) {
    jsonFile = file;
    document.getElementById('jsonFileName').textContent =
        `${file.name} (${formatFileSize(file.size)})`;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            jsonData = JSON.parse(e.target.result);
            validateAndDisplayJson();
            checkFilesLoaded();
        } catch (error) {
            showJsonError('Invalid JSON file format: ' + error.message);
        }
    };
    reader.readAsText(file);
}

// Validate and display JSON info
function validateAndDisplayJson() {
    const errorDiv = document.getElementById('jsonError');
    errorDiv.style.display = 'none';

    if (!jsonData.frames) {
        showJsonError('JSON must contain a "frames" object');
        return;
    }

    const sprites = Object.keys(jsonData.frames);
    const spriteCount = sprites.length;

    let dimensions = 'Unknown';
    let format = 'Custom';

    if (jsonData.meta) {
        if (jsonData.meta.size) {
            dimensions = `${jsonData.meta.size.w}x${jsonData.meta.size.h}`;
        }
        if (jsonData.meta.app) {
            format = jsonData.meta.app;
        }
    }

    // Update JSON info display
    document.getElementById('spriteCount').textContent = spriteCount;
    document.getElementById('spriteDimensions').textContent = dimensions;
    document.getElementById('spriteFormat').textContent = format;

    // Generate sprite preview
    generateSpritePreview();
}

// Improved PREVIEW LOGIC: Cropped, scaled, and name truncated
function generateSpritePreview() {
    if (!spritesheetImg || !jsonData) return;

    const previewCard = document.getElementById('previewCard');
    const spriteGrid = document.getElementById('spriteGrid');

    spriteGrid.innerHTML = '';

    const sprites = Object.keys(jsonData.frames);

    sprites.forEach((spriteName) => {
        const frame = jsonData.frames[spriteName].frame;
        const rotated = jsonData.frames[spriteName].rotated || false;

        // Use only the actual sprite's size (not a fixed 80x80, but scale to fit)
        const previewBoxSize = 80; // px square preview box
        const spriteWidth = rotated ? frame.h : frame.w;
        const spriteHeight = rotated ? frame.w : frame.h;

        // Create a canvas for just this sprite's real size
        const spriteCanvas = document.createElement('canvas');
        spriteCanvas.width = spriteWidth;
        spriteCanvas.height = spriteHeight;
        const spriteCtx = spriteCanvas.getContext('2d');

        // Draw cropped sprite onto its own canvas
        if (rotated) {
            // Need to rotate 90deg clockwise
            spriteCtx.save();
            spriteCtx.translate(spriteWidth / 2, spriteHeight / 2);
            spriteCtx.rotate(Math.PI / 2);
            spriteCtx.drawImage(
                spritesheetImg,
                frame.x,
                frame.y,
                frame.w,
                frame.h,
                -frame.h / 2,
                -frame.w / 2,
                frame.h,
                frame.w
            );
            spriteCtx.restore();
        } else {
            spriteCtx.drawImage(
                spritesheetImg,
                frame.x,
                frame.y,
                frame.w,
                frame.h,
                0,
                0,
                frame.w,
                frame.h
            );
        }

        // Now, draw that spriteCanvas into a fixed-size preview box, fitting it nicely
        const previewCanvas = document.createElement('canvas');
        previewCanvas.width = previewBoxSize;
        previewCanvas.height = previewBoxSize;
        const previewCtx = previewCanvas.getContext('2d');

        const scale = Math.min(previewBoxSize / spriteWidth, previewBoxSize / spriteHeight, 1);
        const drawWidth = spriteWidth * scale;
        const drawHeight = spriteHeight * scale;
        const drawX = (previewBoxSize - drawWidth) / 2;
        const drawY = (previewBoxSize - drawHeight) / 2;

        previewCtx.drawImage(spriteCanvas, 0, 0, spriteWidth, spriteHeight, drawX, drawY, drawWidth, drawHeight);

        // HTML for grid
        const spriteItem = document.createElement('div');
        spriteItem.className = 'sprite-item';
        spriteItem.title = spriteName; // hover to see full name

        previewCanvas.className = 'sprite-canvas';
        spriteItem.appendChild(previewCanvas);

        // Truncated name
        const spriteNameElement = document.createElement('div');
        spriteNameElement.className = 'sprite-name';
        // Use CSS to ellipsis/clip name, but always show full on hover (via title)
        spriteNameElement.textContent = spriteName.length > 14 ? spriteName.slice(0, 12) + '…' : spriteName;
        spriteNameElement.title = spriteName;
        spriteItem.appendChild(spriteNameElement);

        spriteGrid.appendChild(spriteItem);
    });

    // Hide legend in preview
    document.getElementById('spriteLegend').style.display = 'none';

    previewCard.style.display = 'block';
}

// Check if both files are loaded
function checkFilesLoaded() {
    if (spritesheetImg && jsonData) {
        document.getElementById('labelBtn').disabled = false;
        document.getElementById('cutBtn').disabled = false;
        generateSpritePreview();
    }
}

// Progress bar utilities
function showProgress(text = '') {
    const container = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');

    container.classList.add('processing');
    progressBar.classList.add('show');
    progressText.textContent = text;
}

function updateProgress(percent, text = '') {
    document.getElementById('progressFill').style.width = percent + '%';
    if (text) {
        document.getElementById('progressText').textContent = text;
    }
}

function hideProgress() {
    const container = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');

    container.classList.remove('processing');
    progressBar.classList.remove('show');
    document.getElementById('progressFill').style.width = '0%';
    progressText.textContent = '';
}

// Button loading state
function setButtonLoading(button, loading) {
    if (loading) {
        button.classList.add('btn-loading');
        button.disabled = true;
    } else {
        button.classList.remove('btn-loading');
        button.disabled = !(spritesheetImg && jsonData);
    }
}

// Color generator for sprite borders
function getColorForSprite(index, total) {
    const hue = (index / total) * 360;
    return `hsl(${hue}, 70%, 60%)`;
}

async function downloadLabeledSpritesheet() {
    const labelBtn = document.getElementById('labelBtn');
    setButtonLoading(labelBtn, true);
    showProgress('Creating labeled spritesheet...');

    try {
        // Create canvas with original spritesheet dimensions + room for legend if needed
        const sprites = Object.keys(jsonData.frames);

        // Gather which ones have a legend number
        let legendItems = [];
        let smallSpriteNumber = 1;
        let localNumLookup = {};
        sprites.forEach((spriteName) => {
            const frame = jsonData.frames[spriteName].frame;
            const rotated = jsonData.frames[spriteName].rotated || false;
            const spriteWidth = rotated ? frame.h : frame.w;
            const spriteHeight = rotated ? frame.w : frame.h;
            const fontSize = Math.max(10, Math.min(spriteWidth, spriteHeight) / 12);
            // Use a temp canvas context for text width measuring
            let tempCanvas = document.createElement('canvas');
            let ctx2 = tempCanvas.getContext('2d');
            ctx2.font = `bold ${fontSize}px Inter`;
            const textWidth = ctx2.measureText(spriteName).width;
            const textHeight = fontSize;
            if (spriteWidth < textWidth + 10 || spriteHeight < textHeight + 8) {
                localNumLookup[spriteName] = smallSpriteNumber++;
                legendItems.push({ num: localNumLookup[spriteName], name: spriteName });
            }
        });

        // Make canvas taller if legend is needed
        const legendHeight = legendItems.length > 0 ? 32 + 18 * legendItems.length : 0;
        const canvas = document.createElement('canvas');
        canvas.width = jsonData.meta.size.w;
        canvas.height = jsonData.meta.size.h + legendHeight;
        const ctx = canvas.getContext('2d');

        // Draw original image at full size
        ctx.drawImage(spritesheetImg, 0, 0, canvas.width, jsonData.meta.size.h);
        updateProgress(25, 'Drawing base image...');

        let processed = 0;

        for (const spriteName of sprites) {
            const frame = jsonData.frames[spriteName].frame;
            const rotated = jsonData.frames[spriteName].rotated || false;

            // Get color for this sprite
            const color = getColorForSprite(processed, sprites.length);

            const spriteWidth = rotated ? frame.h : frame.w;
            const spriteHeight = rotated ? frame.w : frame.h;

            // Draw border with proper dimensions
            ctx.strokeStyle = color;
            ctx.lineWidth = Math.max(2, Math.min(spriteWidth, spriteHeight) / 50);
            ctx.strokeRect(frame.x, frame.y, spriteWidth, spriteHeight);

            // Calculate font size based on sprite size (smaller to fit inside)
            const fontSize = Math.max(10, Math.min(spriteWidth, spriteHeight) / 12);
            ctx.font = `bold ${fontSize}px Inter`;
            const textWidth = ctx.measureText(spriteName).width;
            const textHeight = fontSize;

            // Only draw label if sprite is big enough to accommodate it
            if (spriteWidth > textWidth + 10 && spriteHeight > textHeight + 8) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                ctx.fillRect(frame.x + 2, frame.y + 2, textWidth + 8, textHeight + 6);

                ctx.fillStyle = '#ffffff';
                ctx.fillText(spriteName, frame.x + 6, frame.y + textHeight + 4);
            } else {
                // Small: use number
                const legendNum = localNumLookup[spriteName];
                if (legendNum) {
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                    ctx.fillRect(frame.x + 2, frame.y + 2, fontSize + 8, textHeight + 6);

                    ctx.fillStyle = '#ffff99';
                    ctx.font = `bold ${fontSize}px Inter`;
                    ctx.fillText(legendNum.toString(), frame.x + 8, frame.y + textHeight + 4);
                }
            }
            processed++;
            updateProgress(
                25 + (processed / sprites.length) * 65,
                `Labeling sprite ${processed}/${sprites.length}...`
            );
        }

        // Draw legend at the bottom if needed
        if (legendItems.length > 0) {
            ctx.save();
            ctx.fillStyle = '#222';
            ctx.fillRect(0, jsonData.meta.size.h, canvas.width, legendHeight);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 16px Inter';
            ctx.fillText('Legend:', 16, jsonData.meta.size.h + 24);

            ctx.font = '14px Inter';
            legendItems.forEach((item, idx) => {
                ctx.fillStyle = '#ffff99';
                ctx.fillText(item.num.toString(), 24, jsonData.meta.size.h + 48 + idx * 18);
                ctx.fillStyle = '#fff';
                ctx.fillText(': ' + item.name, 48, jsonData.meta.size.h + 48 + idx * 18);
            });
            ctx.restore();
        }

        // Download
        updateProgress(95, 'Preparing download...');
        const link = document.createElement('a');
        link.download = 'labeled_spritesheet.png';
        link.href = canvas.toDataURL();
        link.click();

        // Update stats
        stats.totalProcessed++;
        stats.totalSprites += sprites.length;
        updateStats();
        saveStats();

        updateProgress(100, 'Complete!');
        setTimeout(() => {
            hideProgress();
            setButtonLoading(labelBtn, false);
        }, 1000);
    } catch (error) {
        alert('Error creating labeled spritesheet: ' + error.message);
        hideProgress();
        setButtonLoading(labelBtn, false);
    }
}

// FIXED: Each sprite is now a cropped PNG, not full-size with transparent BG
async function cutSpritesheet() {
    const cutBtn = document.getElementById('cutBtn');
    setButtonLoading(cutBtn, true);
    showProgress('Preparing to cut sprites...');

    try {
        // Use JSZip from CDN
        updateProgress(5, 'Loading JSZip...');
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        document.head.appendChild(script);

        await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
        });

        const zip = new JSZip();
        updateProgress(10, 'Creating sprite files...');

        const sprites = Object.keys(jsonData.frames);
        let processed = 0;

        for (const spriteName of sprites) {
            const frame = jsonData.frames[spriteName].frame;
            const rotated = jsonData.frames[spriteName].rotated || false;

            // CROP LOGIC: canvas only as big as sprite
            const sw = rotated ? frame.h : frame.w;
            const sh = rotated ? frame.w : frame.h;
            const spriteCanvas = document.createElement('canvas');
            spriteCanvas.width = sw;
            spriteCanvas.height = sh;
            const spriteCtx = spriteCanvas.getContext('2d');

            if (rotated) {
                spriteCtx.save();
                spriteCtx.translate(sw / 2, sh / 2);
                spriteCtx.rotate(Math.PI / 2);
                spriteCtx.drawImage(
                    spritesheetImg,
                    frame.x, frame.y, frame.w, frame.h,
                    -frame.h / 2, -frame.w / 2, frame.h, frame.w
                );
                spriteCtx.restore();
            } else {
                spriteCtx.drawImage(
                    spritesheetImg,
                    frame.x, frame.y, frame.w, frame.h,
                    0, 0, frame.w, frame.h
                );
            }

            // Convert to blob and add to zip
            const blob = await new Promise((resolve) => {
                spriteCanvas.toBlob(resolve, 'image/png');
            });

            zip.file(`${spriteName}.png`, blob);

            processed++;
            updateProgress(
                10 + (processed / sprites.length) * 70,
                `Processing sprite ${processed}/${sprites.length}...`
            );
        }

        // Generate zip
        updateProgress(85, 'Creating zip file...');
        const zipBlob = await zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
        });

        // Download
        updateProgress(95, 'Preparing download...');
        const link = document.createElement('a');
        link.download = 'sprites_fullsize.zip';
        link.href = URL.createObjectURL(zipBlob);
        link.click();

        // Update stats
        stats.totalProcessed++;
        stats.totalSprites += sprites.length;
        updateStats();
        saveStats();

        updateProgress(100, 'Complete!');
        setTimeout(() => {
            hideProgress();
            setButtonLoading(cutBtn, false);
        }, 1000);
    } catch (error) {
        alert('Error cutting spritesheet: ' + error.message);
        hideProgress();
        setButtonLoading(cutBtn, false);
    }
}

// Clear all files
function clearAll() {
    // Reset variables
    spritesheetImg = null;
    jsonData = null;
    imageFile = null;
    jsonFile = null;

    // Reset UI
    document.getElementById('imageInput').value = '';
    document.getElementById('jsonInput').value = '';
    document.getElementById('imageStatus').classList.remove('show');
    document.getElementById('jsonStatus').classList.remove('show');
    document.getElementById('jsonError').style.display = 'none';
    document.getElementById('previewCard').style.display = 'none';

    // Reset upload areas
    document.getElementById('imageUpload').classList.remove('has-file', 'error');
    document.getElementById('jsonUpload').classList.remove('has-file', 'error');

    // Disable buttons
    document.getElementById('labelBtn').disabled = true;
    document.getElementById('cutBtn').disabled = true;

    hideProgress();
}

// Cancel current operation
function cancelOperation() {
    if (currentOperation) {
        currentOperation.cancelled = true;
    }
    hideProgress();

    // Re-enable buttons
    document.getElementById('labelBtn').disabled = !(spritesheetImg && jsonData);
    document.getElementById('cutBtn').disabled = !(spritesheetImg && jsonData);
    setButtonLoading(document.getElementById('labelBtn'), false);
    setButtonLoading(document.getElementById('cutBtn'), false);
}

// Keyboard shortcuts
document.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT') return;

    switch (e.key) {
        case 'Enter':
            e.preventDefault();
            if (!document.getElementById('cutBtn').disabled) {
                cutSpritesheet();
            }
            break;
        case 'Escape':
            e.preventDefault();
            clearAll();
            break;
    }
});

// Initialize everything
document.addEventListener('DOMContentLoaded', function () {
    createParticles();
    updateStats();

    // Setup file uploads
    setupFileUpload(
        document.getElementById('imageUpload'),
        document.getElementById('imageInput'),
        document.getElementById('imageStatus'),
        handleImageFile
    );

    setupFileUpload(
        document.getElementById('jsonUpload'),
        document.getElementById('jsonInput'),
        document.getElementById('jsonStatus'),
        handleJsonFile
    );

    // Setup button handlers
    document.getElementById('labelBtn').addEventListener('click', downloadLabeledSpritesheet);
    document.getElementById('cutBtn').addEventListener('click', cutSpritesheet);
    document.getElementById('clearBtn').addEventListener('click', clearAll);
    document.getElementById('cancelBtn').addEventListener('click', cancelOperation);
});
