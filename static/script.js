document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const imageUpload = document.getElementById('image-upload');
    const uploadBtn = document.getElementById('upload-btn');
    const dropArea = document.getElementById('drop-area');
    const previewContainer = document.getElementById('preview-container');
    const imagePreview = document.getElementById('image-preview');
    const userImage = document.getElementById('user-image');
    const frame = document.getElementById('frame');
    const poster = document.getElementById('poster');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const rotateLeftBtn = document.getElementById('rotate-left');
    const rotateRightBtn = document.getElementById('rotate-right');
    const centerBtn = document.getElementById('center-image');
    const resetBtn = document.getElementById('reset-image');
    const modifyBtn = document.getElementById('modify-btn');
    const downloadBtn = document.getElementById('download-btn');
    const newBtn = document.getElementById('new-btn');
    const notification = document.getElementById('notification');
    const userNameInput = document.getElementById('user-name');
    const userEmailInput = document.getElementById('user-email');
    const templateImg = document.getElementById('template-img');
    const finalPreviewContainer = document.getElementById('final-preview-container');
    const finalPreview = document.getElementById('final-preview');

    // State variables
    let userScale = 1;
    let rotation = 0;
    let posX = 0;
    let posY = 0;
    let isDragging = false;
    let startX, startY, startPosX, startPosY;
    let imgNaturalWidth = 0;
    let imgNaturalHeight = 0;
    let fitScale = 1;
    let isPreviewGenerated = false;
    let isUploading = false;
    let isDownloading = false;

    // Fonction pour valider l'email (dupliquée de Python pour cohérence)
    function isValidEmail(email) {
        return /^[\w\.-]+@[\w\.-]+\.\w+$/.test(email);
    }

    // Fonction pour afficher les erreurs (ajoutée car manquante)
    function showError(message) {
        alert(message); // Peut être remplacée par une notification plus avancée si besoin
    }

    // Choisir une couleur aléatoire pour la bordure du frame
    const colors = ['#c5093c', '#1c6826'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    frame.style.borderColor = randomColor;

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, e => {
            e.preventDefault();
            e.stopPropagation();
        }, false);
    });

    // Drag hover styles
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => {
            dropArea.classList.add('drag-over', 'border-primary');
        });
    });
    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => {
            dropArea.classList.remove('drag-over', 'border-primary');
        });
    });

    // Trigger file input
    uploadBtn.addEventListener('click', () => {
        if (!isUploading) imageUpload.click();
    });
    dropArea.addEventListener('click', () => {
        if (!isUploading) imageUpload.click();
    });

    // Drop event
    dropArea.addEventListener('drop', (e) => {
        if (isUploading) return;
        const files = e.dataTransfer.files;
        if (files && files[0]) handleFile(files[0]);
    });

    // File selected event
    imageUpload.addEventListener('change', function(e) {
        if (isUploading) return;
        if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
    });

    // Main file handler
    function handleFile(file) {
        if (isUploading) return;

        if (!file.type.startsWith('image/')) {
            showError('Veuillez sélectionner une image valide (JPG, PNG, GIF)');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            showError('La taille du fichier dépasse 10MB');
            return;
        }

        isUploading = true;
        uploadBtn.disabled = true;
        dropArea.style.pointerEvents = 'none';

        progressBar.style.width = '0%';
        progressText.textContent = '0%';

        // Simulate upload progress
        let progress = 0;
        const interval = setInterval(() => {
            progress += 5;
            progressBar.style.width = `${Math.min(progress, 100)}%`;
            progressText.textContent = `${Math.min(progress, 100)}%`;
            if (progress >= 100) {
                clearInterval(interval);
                setTimeout(() => {
                    progressBar.style.width = '0%';
                    progressText.textContent = '0%';
                    isUploading = false;
                    uploadBtn.disabled = false;
                    dropArea.style.pointerEvents = 'auto';
                }, 600);
            }
        }, 50);

        const reader = new FileReader();
        reader.onload = function(event) {
            imagePreview.src = event.target.result;
            previewContainer.classList.remove('hidden');

            const tempImage = new Image();
            tempImage.src = event.target.result;
            tempImage.onload = () => {
                imgNaturalWidth = tempImage.naturalWidth;
                imgNaturalHeight = tempImage.naturalHeight;

                userImage.src = event.target.result;

                userScale = 1;
                rotation = 0;
                posX = 0;
                posY = 0;
                isPreviewGenerated = false;
                downloadBtn.disabled = true;

                frame.classList.add('has-image');

                computeFitScaleCover(() => {
                    updateImageTransform();
                    userImage.style.display = 'block';
                    renderPreview();
                });
            };
            tempImage.onerror = () => {
                showError('Impossible de charger l\'image. Veuillez réessayer.');
                isUploading = false;
                uploadBtn.disabled = false;
                dropArea.style.pointerEvents = 'auto';
            };
        };
        reader.readAsDataURL(file);
    }

    // Compute scale to cover frame
    function computeFitScaleCover(callback) {
        const frameRect = frame.getBoundingClientRect();
        const fw = frameRect.width;
        const fh = frameRect.height;

        if (fw <= 10 || fh <= 10 || imgNaturalWidth <= 0 || imgNaturalHeight <= 0) {
            showError('Dimensions invalides, veuillez réessayer.');
            return;
        }

        fitScale = Math.max(fw / imgNaturalWidth, fh / imgNaturalHeight);
        userScale = 1;
        posX = 0;
        posY = 0;

        clampPosition();

        if (callback) callback();
    }

    // Drag handlers
    frame.addEventListener('mousedown', startDrag);
    frame.addEventListener('touchstart', startDrag, { passive: false });

    function startDrag(e) {
        if (!userImage.src) return;
        e.preventDefault();
        isDragging = true;
        userImage.style.cursor = 'grabbing';

        if (e.type === 'mousedown') {
            startX = e.clientX;
            startY = e.clientY;
        } else {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        }
        startPosX = posX;
        startPosY = posY;

        document.addEventListener('mousemove', drag);
        document.addEventListener('touchmove', drag, { passive: false });
        document.addEventListener('mouseup', endDrag);
        document.addEventListener('touchend', endDrag);
    }

    function drag(e) {
        if (!isDragging) return;
        e.preventDefault();

        let clientX, clientY;
        if (e.type === 'mousemove') {
            clientX = e.clientX;
            clientY = e.clientY;
        } else {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        }

        posX = startPosX + (clientX - startX);
        posY = startPosY + (clientY - startY);
        clampPosition();
        updateImageTransform();
        isPreviewGenerated = false;
        downloadBtn.disabled = true;
        renderPreview();
    }

    function endDrag() {
        isDragging = false;
        userImage.style.cursor = 'grab';
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('touchmove', drag);
        document.removeEventListener('mouseup', endDrag);
        document.removeEventListener('touchend', endDrag);
    }

    // Zoom controls
    zoomInBtn.addEventListener('click', () => {
        userScale *= 1.12;
        clampPosition();
        updateImageTransform();
        isPreviewGenerated = false;
        downloadBtn.disabled = true;
        renderPreview();
    });

    zoomOutBtn.addEventListener('click', () => {
        userScale = Math.max(0.3, userScale / 1.12);
        clampPosition();
        updateImageTransform();
        isPreviewGenerated = false;
        downloadBtn.disabled = true;
        renderPreview();
    });

    // Rotation controls
    rotateLeftBtn.addEventListener('click', () => {
        rotation = (rotation - 15) % 360;
        clampPosition();
        updateImageTransform();
        isPreviewGenerated = false;
        downloadBtn.disabled = true;
        renderPreview();
    });

    rotateRightBtn.addEventListener('click', () => {
        rotation = (rotation + 15) % 360;
        clampPosition();
        updateImageTransform();
        isPreviewGenerated = false;
        downloadBtn.disabled = true;
        renderPreview();
    });

    // Position controls
    centerBtn.addEventListener('click', () => {
        posX = 0;
        posY = 0;
        clampPosition();
        updateImageTransform();
        isPreviewGenerated = false;
        downloadBtn.disabled = true;
        renderPreview();
    });

    resetBtn.addEventListener('click', () => {
        userScale = 1;
        rotation = 0;
        posX = 0;
        posY = 0;
        isPreviewGenerated = false;
        downloadBtn.disabled = true;
        computeFitScaleCover(() => {
            updateImageTransform();
            renderPreview();
        });
    });

    // Update transform style
    function updateImageTransform() {
        const totalScale = fitScale * userScale;
        userImage.style.transform = `translate(${posX}px, ${posY}px) scale(${totalScale}) rotate(${rotation}deg)`;
        userImage.style.transformOrigin = 'center center';
    }

    // Clamp position to keep image covering the frame (cropping allowed)
    function clampPosition() {
        if (!userImage.src) return;
        const frameRect = frame.getBoundingClientRect();
        const fw = frameRect.width;
        const fh = frameRect.height;

        const totalScale = fitScale * userScale;
        const w = imgNaturalWidth * totalScale;
        const h = imgNaturalHeight * totalScale;
        const rad = Math.abs(rotation % 180) * Math.PI / 180;
        const cos = Math.abs(Math.cos(rad));
        const sin = Math.abs(Math.sin(rad));

        // Calculate rotated bounding box size
        const rotW = w * cos + h * sin;
        const rotH = w * sin + h * cos;

        // Max offset allowed (cropping)
        const maxX = (rotW - fw) / 2;
        const maxY = (rotH - fh) / 2;

        if (maxX < 0) posX = 0;
        else posX = Math.min(maxX, Math.max(-maxX, posX));
        if (maxY < 0) posY = 0;
        else posY = Math.min(maxY, Math.max(-maxY, posY));
    }

    // Generate poster canvas
    function generatePoster(outputScale = 1, callback) {
        const canvas = document.createElement('canvas');
        canvas.width = 2314 * outputScale;
        canvas.height = 2747 * outputScale;
        const ctx = canvas.getContext('2d');

        const frameX = 541 * outputScale;
        const frameY = 827 * outputScale;
        const frameW = 1081 * outputScale;
        const frameH = 1255 * outputScale;

        // Draw template background
        ctx.drawImage(templateImg, 0, 0, canvas.width, canvas.height);

        // Create clipping path (rounded rectangle)
        const radius = 20 * outputScale; // ajuster si besoin
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(frameX + radius, frameY);
        ctx.lineTo(frameX + frameW - radius, frameY);
        ctx.quadraticCurveTo(frameX + frameW, frameY, frameX + frameW, frameY + radius);
        ctx.lineTo(frameX + frameW, frameY + frameH - radius);
        ctx.quadraticCurveTo(frameX + frameW, frameY + frameH, frameX + frameW - radius, frameY + frameH);
        ctx.lineTo(frameX + radius, frameY + frameH);
        ctx.quadraticCurveTo(frameX, frameY + frameH, frameX, frameY + frameH - radius);
        ctx.lineTo(frameX, frameY + radius);
        ctx.quadraticCurveTo(frameX, frameY, frameX + radius, frameY);
        ctx.closePath();
        ctx.clip();

        // Draw user image with transformation
        const totalScale = fitScale * userScale;
        const scaleFactor = frameW / frame.getBoundingClientRect().width;

        const finalPosX = posX * scaleFactor;
        const finalPosY = posY * scaleFactor;

        ctx.translate(frameX + frameW / 2 + finalPosX, frameY + frameH / 2 + finalPosY);
        ctx.rotate(rotation * Math.PI / 180);
        ctx.scale(totalScale * scaleFactor, totalScale * scaleFactor);
        ctx.drawImage(userImage, -imgNaturalWidth / 2, -imgNaturalHeight / 2, imgNaturalWidth, imgNaturalHeight);

        ctx.restore();

        // Optional: draw frame border here if needed

        callback(canvas);
    }

    // Render preview thumbnail
    function renderPreview() {
        if (!userImage.src) return;

        function doRender() {
            generatePoster(0.3, (canvas) => {
                finalPreview.src = canvas.toDataURL('image/jpeg', 0.8);
                finalPreviewContainer.classList.remove('hidden');
                isPreviewGenerated = true;
                downloadBtn.disabled = false;
            });
        }

        if (templateImg.complete && templateImg.naturalWidth > 0) {
            doRender();
        } else {
            templateImg.onload = doRender;
            templateImg.onerror = () => showError('Impossible de charger le template pour la prévisualisation.');
            templateImg.src = 'template.jpg?' + new Date().getTime();
        }
    }

    downloadBtn.addEventListener('click', () => {
        if (!isPreviewGenerated || isDownloading) {
            showError('Veuillez d\'abord ajuster et prévisualiser l\'affiche ou attendez la fin du téléchargement.');
            return;
        }
        const name = userNameInput.value.trim();
        const email = userEmailInput.value.trim();
        if (!name) {
            showError('Veuillez entrer votre nom');
            userNameInput.focus();
            return;
        }
        if (!email || !isValidEmail(email)) {
            showError('Veuillez entrer un email valide');
            userEmailInput.focus();
            return;
        }

        // Désactive bouton pour éviter clics multiples
        downloadBtn.disabled = true;
        downloadBtn.textContent = 'En cours...'; // Afficher "En cours" sur le bouton
        isDownloading = true;

        // Maintenir la bordure pendant le téléchargement
        frame.style.border = `2px solid ${randomColor}`;

        // Lancer le téléchargement d'abord
        renderDownload(() => {
            // Ensuite, envoyer le mail
            sendContact(name, email);
        });
    });

    function renderDownload(callback) {
        generatePoster(1, (canvas) => {
            canvas.toBlob(blob => {
                if (!blob) {
                    showError('Échec de la génération de l\'image. Veuillez réessayer.');
                    resetDownloadBtn();
                    return;
                }
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                const safeName = name.replace(/[^a-zA-Z0-9-]/g, '-') || 'affiche';
                link.download = `affiche-${safeName}.jpg`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);

                notification.style.transform = 'translateY(0)';
                setTimeout(() => {
                    notification.style.transform = 'translateY(20rem)';
                }, 3000);

                // Appel du callback pour envoyer le mail après téléchargement
                if (callback) callback();
            }, 'image/jpeg', 0.95);
        });
    }

    function sendContact(name, email) {
        // Envoie AJAX POST au serveur Flask
        fetch('/contact', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                'user-name': name,
                'user-email': email,
            }),
        })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => { throw new Error(text); });
            }
            return response.text();
        })
        .then(message => {
            // Mail envoyé avec succès
            showNotification('Mail envoyé avec succès !');
        })
        .catch(error => {
            showError('Erreur lors de l’envoi du mail: ' + error.message);
        })
        .finally(() => {
            resetDownloadBtn();
        });
    }

    function resetDownloadBtn() {
        downloadBtn.disabled = false;
        downloadBtn.textContent = 'Télécharger'; // Remettre le texte original
        isDownloading = false;
        // Maintenir ou restaurer la bordure si nécessaire
        frame.style.border = `2px solid ${randomColor}`;
    }

    function showNotification(message) {
        // Vous pouvez personnaliser cela pour une meilleure notification
        alert(message);
    }
});