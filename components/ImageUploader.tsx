import React, { useState, useRef, useEffect } from 'react';
import { recognizeText, validateRecognizedText, OCRProgress } from '../services/ocrService';
import { normalizeOCRText } from '../services/geminiService';
import { useTheme } from '../contexts/ThemeContext';
import { Theme } from '../types';

interface ImageUploaderProps {
  onTextRecognized: (text: string) => void;
  onError?: (error: string) => void;
}

type UploadState = 'idle' | 'uploading' | 'cropping' | 'recognizing' | 'success' | 'error';

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onTextRecognized, onError }) => {
  const { theme } = useTheme();
  const isFresh = theme === Theme.FRESH;
  
  const [state, setState] = useState<UploadState>('idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [recognizedText, setRecognizedText] = useState<string>('');
  const [normalizedText, setNormalizedText] = useState<string>('');
  const [editedText, setEditedText] = useState<string>('');
  const [progress, setProgress] = useState<OCRProgress | null>(null);
  const [normalizing, setNormalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  
  // 裁剪相关状态
  const [cropArea, setCropArea] = useState<CropArea | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  
  // 使用ref来跟踪拖拽状态，避免闭包问题
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const cropAreaRef = useRef<CropArea | null>(null);
  const imageSizeRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });
  const normalizedTextRef = useRef<string>('');
  const pinchStartDistanceRef = useRef<number | null>(null);
  const pinchStartCropRef = useRef<CropArea | null>(null);
  
  // 同步ref和state
  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);
  
  useEffect(() => {
    dragStartRef.current = dragStart;
  }, [dragStart]);
  
  useEffect(() => {
    cropAreaRef.current = cropArea;
  }, [cropArea]);
  
  useEffect(() => {
    imageSizeRef.current = imageSize;
  }, [imageSize]);

  useEffect(() => {
    normalizedTextRef.current = normalizedText;
  }, [normalizedText]);

  // 计算双指距离
  const getTouchDistance = (touches: TouchList) => {
    if (touches.length < 2) return null;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cropCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // 支持的图片格式
  const ACCEPTED_FORMATS = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  // 验证文件
  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_FORMATS.includes(file.type)) {
      return '请选择图片文件（JPG、PNG、GIF、WebP）';
    }
    if (file.size > MAX_FILE_SIZE) {
      return '图片文件过大，请选择小于10MB的图片';
    }
    return null;
  };

  // 初始化裁剪区域（默认选择整个图片）
  const initializeCropArea = (img: HTMLImageElement, containerWidth: number) => {
    const scale = containerWidth / img.naturalWidth;
    const displayHeight = img.naturalHeight * scale;
    
    setImageSize({
      width: containerWidth,
      height: displayHeight
    });

    // 默认选择整个图片，但留一些边距
    const margin = 20;
    setCropArea({
      x: margin,
      y: margin,
      width: Math.max(100, containerWidth - margin * 2),
      height: Math.max(100, displayHeight - margin * 2)
    });
  };
  
  // 关闭裁剪模态框
  const handleCloseCropModal = () => {
    setShowCropModal(false);
    handleReset();
  };

  // 处理文件选择
  const handleFileSelect = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setState('error');
      if (onError) onError(validationError);
      return;
    }

    setState('uploading');
    setError(null);
    setPreviewUrl(null);
    setRecognizedText('');
    setCropArea(null);
    setOriginalImage(null);

    try {
      // 创建预览URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      // 加载图片以获取尺寸
      const img = new Image();
      img.onload = () => {
        setOriginalImage(img);
        // 设置状态为cropping并显示裁剪模态框
        setState('cropping');
        setShowCropModal(true);
        
        // 延迟初始化，确保模态框已渲染
        setTimeout(() => {
          if (imageContainerRef.current) {
            // 使用视口宽度，但留一些边距
            const maxWidth = Math.min(window.innerWidth - 80, img.naturalWidth);
            const containerWidth = imageContainerRef.current.clientWidth || 
                                  imageContainerRef.current.offsetWidth ||
                                  maxWidth;
            
            if (containerWidth > 0) {
              console.log('Initializing crop area with container width:', containerWidth);
              initializeCropArea(img, containerWidth);
            } else {
              // 使用后备方案
              const fallbackWidth = Math.min(img.naturalWidth, window.innerWidth - 80);
              initializeCropArea(img, fallbackWidth);
            }
          } else {
            // 如果容器还没有ref，使用图片自然宽度
            const fallbackWidth = Math.min(img.naturalWidth, window.innerWidth - 80);
            initializeCropArea(img, fallbackWidth);
          }
        }, 100);
      };
      img.onerror = () => {
        throw new Error('图片加载失败，请重试');
      };
      img.src = url;
    } catch (err: any) {
      const errorMsg = err.message || '图片加载失败，请重试';
      setError(errorMsg);
      setState('error');
      if (onError) onError(errorMsg);
    }
  };

  // 文件输入变化
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // 重置input，允许选择相同文件
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 打开文件选择器
  const handleSelectFile = () => {
    fileInputRef.current?.click();
  };

  // 启动摄像头
  const handleStartCamera = async () => {
    try {
      // 检查是否是安全上下文（HTTPS或localhost）
      const isSecureContext = window.isSecureContext || 
                              location.protocol === 'https:' || 
                              location.hostname === 'localhost' || 
                              location.hostname === '127.0.0.1';
      
      if (!isSecureContext) {
        throw new Error('摄像头功能需要HTTPS环境。请使用HTTPS访问，或使用"选择图片"功能从相册选择照片。');
      }

      // 检查浏览器支持
      if (!navigator.mediaDevices) {
        throw new Error('您的浏览器不支持摄像头功能。请使用Safari 11+、Chrome 60+或其他现代浏览器。');
      }

      if (!navigator.mediaDevices.getUserMedia) {
        // 尝试使用旧版API（兼容性处理）
        const getUserMedia = navigator.mediaDevices.getUserMedia ||
                            (navigator as any).webkitGetUserMedia ||
                            (navigator as any).mozGetUserMedia ||
                            (navigator as any).msGetUserMedia;
        
        if (!getUserMedia) {
          throw new Error('您的浏览器不支持摄像头功能。请使用Safari 11+、Chrome 60+或其他现代浏览器。');
        }
      }

      // 请求摄像头权限
      const constraints: MediaStreamConstraints = {
        video: { 
          facingMode: 'environment' // 优先使用后置摄像头
        }
      };

      // 在iOS Safari上，可能需要更宽松的约束
      const stream = await navigator.mediaDevices.getUserMedia(constraints).catch(async (err) => {
        // 如果后置摄像头失败，尝试前置摄像头
        if (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError') {
          console.log('后置摄像头不可用，尝试前置摄像头');
          return navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user' }
          });
        }
        throw err;
      });

      cameraStreamRef.current = stream;
      setShowCamera(true);
      setError(null);

      // 设置视频流
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      let errorMsg = '无法访问摄像头';
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = '摄像头权限被拒绝。请在浏览器设置中允许摄像头访问，或使用"选择图片"功能从相册选择照片。';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMsg = '未检测到摄像头设备。请使用"选择图片"功能从相册选择照片。';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMsg = '摄像头被其他应用占用。请关闭其他使用摄像头的应用后重试，或使用"选择图片"功能。';
      } else if (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError') {
        errorMsg = '摄像头不支持请求的设置。请使用"选择图片"功能从相册选择照片。';
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      setError(errorMsg);
      setState('error');
      if (onError) onError(errorMsg);
    }
  };

  // 关闭摄像头
  const handleCloseCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(track => track.stop());
      cameraStreamRef.current = null;
    }
    setShowCamera(false);
  };

  // 拍照
  const handleCapturePhoto = () => {
    if (!cameraVideoRef.current || !canvasRef.current) return;

    const video = cameraVideoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // 设置canvas尺寸
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // 绘制视频帧到canvas
    context.drawImage(video, 0, 0);

    // 转换为blob
    canvas.toBlob(async (blob) => {
      if (blob) {
        // 关闭摄像头
        handleCloseCamera();

        // 创建File对象
        const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
        await handleFileSelect(file);
      }
    }, 'image/jpeg', 0.9);
  };

  // 获取触摸或鼠标坐标
  const getEventCoordinates = (e: React.MouseEvent | React.TouchEvent, rect: DOMRect) => {
    if ('touches' in e && e.touches.length > 0) {
      // 触摸事件
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    } else if ('clientX' in e) {
      // 鼠标事件
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
    return null;
  };

  // 裁剪区域鼠标/触摸事件处理
  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!cropArea || state !== 'cropping') return;
    
    // 阻止默认行为（防止页面滚动）
    e.preventDefault();
    e.stopPropagation();

    // 双指缩放优先处理
    if ('touches' in e && e.touches.length >= 2) {
      const dist = getTouchDistance(e.touches);
      if (dist && cropArea) {
        pinchStartDistanceRef.current = dist;
        pinchStartCropRef.current = { ...cropArea };
      }
      return;
    }
    
    const rect = imageContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const coords = getEventCoordinates(e, rect);
    if (!coords) return;

    // 检查是否点击在裁剪区域内
    if (coords.x >= cropArea.x && coords.x <= cropArea.x + cropArea.width &&
        coords.y >= cropArea.y && coords.y <= cropArea.y + cropArea.height) {
      const dragOffset = { x: coords.x - cropArea.x, y: coords.y - cropArea.y };
      setIsDragging(true);
      setDragStart(dragOffset);
      isDraggingRef.current = true;
      dragStartRef.current = dragOffset;
      
      // 如果是触摸事件，添加全局触摸监听器
      if ('touches' in e) {
        const handleGlobalTouchMove = (moveEvent: TouchEvent) => {
          if (!isDraggingRef.current || !dragStartRef.current || !cropAreaRef.current || !imageContainerRef.current) {
            document.removeEventListener('touchmove', handleGlobalTouchMove);
            return;
          }
          
          moveEvent.preventDefault();
          const rect = imageContainerRef.current.getBoundingClientRect();
          const x = moveEvent.touches[0].clientX - rect.left;
          const y = moveEvent.touches[0].clientY - rect.top;

          const currentCrop = cropAreaRef.current;
          const currentDragStart = dragStartRef.current;
          const currentImageSize = imageSizeRef.current;
          const newX = Math.max(0, Math.min(x - currentDragStart.x, currentImageSize.width - currentCrop.width));
          const newY = Math.max(0, Math.min(y - currentDragStart.y, currentImageSize.height - currentCrop.height));

          const newCropArea = {
            ...currentCrop,
            x: newX,
            y: newY
          };
          setCropArea(newCropArea);
          cropAreaRef.current = newCropArea;
        };

        const handleGlobalTouchEnd = () => {
          document.removeEventListener('touchmove', handleGlobalTouchMove);
          document.removeEventListener('touchend', handleGlobalTouchEnd);
          setIsDragging(false);
          setDragStart(null);
          isDraggingRef.current = false;
          dragStartRef.current = null;
        };

        document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
        document.addEventListener('touchend', handleGlobalTouchEnd);
      }
    }
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    // 触摸事件在handlePointerDown中已处理，这里只处理鼠标事件
    if ('touches' in e) return;
    
    if (!isDragging || !dragStart || !cropArea || !imageContainerRef.current) return;

    // 阻止默认行为（防止页面滚动）
    e.preventDefault();

    const rect = imageContainerRef.current.getBoundingClientRect();
    const coords = getEventCoordinates(e, rect);
    if (!coords) return;

    const newX = Math.max(0, Math.min(coords.x - dragStart.x, imageSize.width - cropArea.width));
    const newY = Math.max(0, Math.min(coords.y - dragStart.y, imageSize.height - cropArea.height));

    setCropArea({
      ...cropArea,
      x: newX,
      y: newY
    });
  };

  const handlePointerUp = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault();
    }
    setIsDragging(false);
    setDragStart(null);
  };

  // 双指缩放开始
  const handlePinchStart = (e: React.TouchEvent) => {
    if (!cropArea || state !== 'cropping') return;
    if (e.touches.length < 2) return;
    e.preventDefault();
    const dist = getTouchDistance(e.touches);
    if (dist) {
      pinchStartDistanceRef.current = dist;
      pinchStartCropRef.current = { ...cropArea };
    }
  };

  // 双指缩放移动
  const handlePinchMove = (e: React.TouchEvent) => {
    if (e.touches.length < 2) return;
    if (!pinchStartDistanceRef.current || !pinchStartCropRef.current || !imageSizeRef.current || !cropAreaRef.current) return;
    e.preventDefault();
    const dist = getTouchDistance(e.touches);
    if (!dist) return;

    const scale = dist / pinchStartDistanceRef.current;
    const startCrop = pinchStartCropRef.current;
    const currentImageSize = imageSizeRef.current;

    const centerX = startCrop.x + startCrop.width / 2;
    const centerY = startCrop.y + startCrop.height / 2;

    const newWidth = Math.min(currentImageSize.width, Math.max(50, startCrop.width * scale));
    const newHeight = Math.min(currentImageSize.height, Math.max(50, startCrop.height * scale));

    const newX = Math.min(
      Math.max(0, centerX - newWidth / 2),
      currentImageSize.width - newWidth
    );
    const newY = Math.min(
      Math.max(0, centerY - newHeight / 2),
      currentImageSize.height - newHeight
    );

    const newCropArea = { x: newX, y: newY, width: newWidth, height: newHeight };
    setCropArea(newCropArea);
    cropAreaRef.current = newCropArea;
  };

  // 双指缩放结束
  const handlePinchEnd = () => {
    pinchStartDistanceRef.current = null;
    pinchStartCropRef.current = null;
  };

  // 调整裁剪区域大小（通过拖拽边缘）
  const handleResize = (e: React.MouseEvent | React.TouchEvent, corner: 'se' | 'sw' | 'ne' | 'nw') => {
    if (!cropArea || !imageContainerRef.current) return;

    e.stopPropagation();
    e.preventDefault();
    
    const rect = imageContainerRef.current.getBoundingClientRect();
    const startCoords = getEventCoordinates(e, rect);
    if (!startCoords) return;
    
    const startX = startCoords.x + rect.left;
    const startY = startCoords.y + rect.top;
    const startCrop = { ...cropArea };
    const startImageSize = imageSizeRef.current;

    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      moveEvent.preventDefault();
      moveEvent.stopPropagation();
      
      let currentX: number;
      let currentY: number;
      
      if (moveEvent instanceof TouchEvent && moveEvent.touches.length > 0) {
        currentX = moveEvent.touches[0].clientX;
        currentY = moveEvent.touches[0].clientY;
      } else if (moveEvent instanceof MouseEvent) {
        currentX = moveEvent.clientX;
        currentY = moveEvent.clientY;
      } else {
        return;
      }
      
      const deltaX = currentX - startX;
      const deltaY = currentY - startY;

      const currentImageSize = imageSizeRef.current;
      let newCrop = { ...startCrop };

      if (corner === 'se') {
        newCrop.width = Math.max(50, Math.min(startCrop.width + deltaX, currentImageSize.width - startCrop.x));
        newCrop.height = Math.max(50, Math.min(startCrop.height + deltaY, currentImageSize.height - startCrop.y));
      } else if (corner === 'sw') {
        newCrop.x = Math.max(0, Math.min(startCrop.x + deltaX, startCrop.x + startCrop.width - 50));
        newCrop.width = Math.max(50, startCrop.width - deltaX);
        newCrop.height = Math.max(50, Math.min(startCrop.height + deltaY, currentImageSize.height - startCrop.y));
      } else if (corner === 'ne') {
        newCrop.width = Math.max(50, Math.min(startCrop.width + deltaX, currentImageSize.width - startCrop.x));
        newCrop.y = Math.max(0, Math.min(startCrop.y + deltaY, startCrop.y + startCrop.height - 50));
        newCrop.height = Math.max(50, startCrop.height - deltaY);
      } else if (corner === 'nw') {
        newCrop.x = Math.max(0, Math.min(startCrop.x + deltaX, startCrop.x + startCrop.width - 50));
        newCrop.width = Math.max(50, startCrop.width - deltaX);
        newCrop.y = Math.max(0, Math.min(startCrop.y + deltaY, startCrop.y + startCrop.height - 50));
        newCrop.height = Math.max(50, startCrop.height - deltaY);
      }

      setCropArea(newCrop);
      cropAreaRef.current = newCrop;
    };

    const handleUp = () => {
      document.removeEventListener('mousemove', handleMove as EventListener);
      document.removeEventListener('mouseup', handleUp);
      document.removeEventListener('touchmove', handleMove as EventListener, { passive: false });
      document.removeEventListener('touchend', handleUp);
    };

    // 添加鼠标和触摸事件监听
    document.addEventListener('mousemove', handleMove as EventListener);
    document.addEventListener('mouseup', handleUp);
    document.addEventListener('touchmove', handleMove as EventListener, { passive: false });
    document.addEventListener('touchend', handleUp);
  };

  // 裁剪图片并识别
  const handleCropAndRecognize = async () => {
    if (!originalImage || !cropArea || !cropCanvasRef.current) return;

    try {
      // 关闭裁剪模态框
      setShowCropModal(false);
      setState('recognizing');
      setError(null);

      const canvas = cropCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 计算实际裁剪区域（相对于原始图片）
      const scaleX = originalImage.naturalWidth / imageSize.width;
      const scaleY = originalImage.naturalHeight / imageSize.height;

      const cropX = cropArea.x * scaleX;
      const cropY = cropArea.y * scaleY;
      const cropWidth = cropArea.width * scaleX;
      const cropHeight = cropArea.height * scaleY;

      // 设置canvas尺寸为裁剪区域
      canvas.width = cropWidth;
      canvas.height = cropHeight;

      // 绘制裁剪区域
      ctx.drawImage(
        originalImage,
        cropX, cropY, cropWidth, cropHeight,
        0, 0, cropWidth, cropHeight
      );

      // 转换为blob
      canvas.toBlob(async (blob) => {
        if (!blob) {
          throw new Error('图片裁剪失败');
        }

        // 创建File对象
        const file = new File([blob], 'cropped-image.jpg', { type: 'image/jpeg' });

        // 开始OCR识别
        const text = await recognizeText(file, (progress) => {
          setProgress(progress);
        });

        // 验证识别结果
        if (!validateRecognizedText(text)) {
          throw new Error('未能识别到文本，请确保图片清晰且包含英文文本');
        }

        setRecognizedText(text);
        setNormalizedText('');
        setEditedText(text);
        setProgress(null);

        // 进行AI规范化
        try {
          setNormalizing(true);
          const normalized = await normalizeOCRText(text);
          setNormalizedText(normalized);
          setEditedText(normalized);
        } catch (normalizeErr: any) {
          console.warn('OCR normalization failed:', normalizeErr);
          // 保留原始文本，不阻断流程
        } finally {
          setNormalizing(false);
        }

        setState('success');
      }, 'image/jpeg', 0.95);
    } catch (err: any) {
      const errorMsg = err.message || '图片识别失败，请确保图片清晰且包含英文文本';
      setError(errorMsg);
      setState('error');
      if (onError) onError(errorMsg);
      setProgress(null);
    }
  };

  // 确认使用识别的文本
  const handleConfirmText = () => {
    const textToUse = (editedText || normalizedText || recognizedText).trim();
    if (textToUse) {
      onTextRecognized(textToUse);
      // 重置状态
      handleReset();
    }
  };

  // 重置
  const handleReset = () => {
    setState('idle');
    setShowCropModal(false);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setOriginalImage(null);
    setRecognizedText('');
    setNormalizedText('');
    setEditedText('');
    setProgress(null);
    setNormalizing(false);
    setError(null);
    setCropArea(null);
    setImageSize({ width: 0, height: 0 });
  };


  // 清理资源
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [previewUrl]);

  // 样式配置
  const cardBg = isFresh
    ? 'bg-white/90 backdrop-blur-sm border-emerald-200'
    : 'bg-white/80 backdrop-blur-sm border-purple-200';
  
  const buttonPrimary = isFresh
    ? 'bg-gradient-to-r from-emerald-400 to-cyan-500'
    : 'bg-gradient-to-r from-purple-500 to-pink-500';
  
  const buttonSecondary = isFresh
    ? 'bg-gradient-to-r from-cyan-400 to-sky-500'
    : 'bg-gradient-to-r from-pink-400 to-rose-500';

  return (
    <>
      <div className={`${cardBg} rounded-3xl p-6 border-2 shadow-xl`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="text-3xl">📸</div>
          <div>
            <div className="text-lg font-black text-gray-800">拍照分析句子</div>
            <div className="text-xs text-gray-500">拍照或上传图片识别英文句子</div>
          </div>
        </div>

        {/* 操作按钮 */}
        {state === 'idle' && (
          <div className="flex gap-3">
            <button
              onClick={handleSelectFile}
              className={`flex-1 ${buttonPrimary} text-white py-3 px-4 rounded-xl font-bold shadow-lg active:scale-95 transition-transform`}
            >
              📁 选择图片
            </button>
            <button
              onClick={async () => {
                // 检查是否是移动设备
                const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                const isSecureContext = window.isSecureContext || 
                                        location.protocol === 'https:' || 
                                        location.hostname === 'localhost' || 
                                        location.hostname === '127.0.0.1';
                
                // 在移动设备上，优先使用文件选择器的capture属性（可以直接调用相机）
                // 这样即使在HTTP环境下也能工作
                if (isMobile) {
                  if (fileInputRef.current) {
                    // 设置capture属性来触发相机
                    fileInputRef.current.setAttribute('capture', 'environment');
                    fileInputRef.current.click();
                    // 点击后移除capture属性，以便下次可以选择相册
                    setTimeout(() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.removeAttribute('capture');
                      }
                    }, 100);
                  }
                } else if (isSecureContext) {
                  // 在桌面HTTPS环境下，使用摄像头API
                  await handleStartCamera();
                } else {
                  // 桌面非HTTPS环境，提示用户
                  setError('摄像头功能需要HTTPS环境。请使用HTTPS访问，或使用"选择图片"功能。');
                  setState('error');
                }
              }}
              className={`flex-1 ${buttonSecondary} text-white py-3 px-4 rounded-xl font-bold shadow-lg active:scale-95 transition-transform`}
            >
              📷 拍照
            </button>
          </div>
        )}

        {/* 图片裁剪界面 - 在主界面显示加载状态 */}
        {state === 'cropping' && !showCropModal && (
          <div className="mt-4 text-center text-gray-500 py-4">
            正在准备裁剪界面...
          </div>
        )}

        {/* 识别进度 */}
        {state === 'recognizing' && progress && (
          <div className="mt-4 space-y-2">
            <div className="text-sm font-medium text-gray-700">
              {progress.status === 'recognizing text' ? '正在识别文字...' : 
               progress.status === 'loading language data' ? '加载语言数据...' :
               progress.status === 'initializing tesseract' ? '初始化OCR引擎...' :
               '处理中...'}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all ${isFresh ? 'bg-emerald-500' : 'bg-purple-500'}`}
                style={{ width: `${progress.progress * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* 识别结果 */}
        {state === 'success' && recognizedText && (
          <div className="mt-4 space-y-3">
            <div className="text-sm font-bold text-gray-700">识别结果（可直接编辑）：</div>
            <div className={`${cardBg} p-4 rounded-xl border-2 border-gray-200 space-y-3`}>
              {normalizing && (
                <div className="text-xs text-gray-500">AI 正在规范化句子...</div>
              )}

              {normalizedText && (
                <div className="text-xs text-gray-500">
                  已根据OCR结果进行AI规范化，请直接在下方编辑最终用于分析的文本。
                </div>
              )}

              <textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="w-full min-h-[140px] rounded-xl border-2 border-gray-200 p-3 text-sm focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none"
                placeholder="在这里删除多余的句子或词，只保留需要分析的一句。"
              />

              <div className="text-xs text-gray-500">
                默认内容来源：AI规范化（若失败则用原始OCR）。可直接编辑后提交。
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-xl font-bold shadow-lg active:scale-95 transition-transform"
              >
                重新选择
              </button>
              <button
                onClick={handleConfirmText}
                disabled={normalizing || !(editedText || normalizedText || recognizedText)}
                className={`flex-1 ${buttonPrimary} ${(normalizing || !(editedText || normalizedText || recognizedText)) ? 'opacity-50 cursor-not-allowed' : ''} text-white py-3 px-4 rounded-xl font-bold shadow-lg active:scale-95 transition-transform`}
              >
                ✓ 确认分析
              </button>
            </div>
          </div>
        )}

        {/* 错误提示 */}
        {state === 'error' && error && (
          <div className={`mt-4 ${isFresh ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-red-100 text-red-700 border-red-200'} p-4 rounded-xl border-2 font-medium text-sm`}>
            {error}
          </div>
        )}

        {/* 加载状态 */}
        {state === 'uploading' && (
          <div className="mt-4 text-center text-gray-600 font-medium">
            正在加载图片...
          </div>
        )}

        {/* 隐藏的文件输入 */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_FORMATS.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
        />
        
        {/* 隐藏的裁剪canvas */}
        <canvas ref={cropCanvasRef} className="hidden" />
      </div>

      {/* 摄像头界面 */}
      {showCamera && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <video
            ref={cameraVideoRef}
            autoPlay
            playsInline
            className="flex-1 object-cover"
          />
          <div className="bg-black/80 p-6 flex gap-4">
            <button
              onClick={handleCloseCamera}
              className="flex-1 bg-gray-600 text-white py-4 px-6 rounded-xl font-bold shadow-lg active:scale-95 transition-transform"
            >
              ✕ 取消
            </button>
            <button
              onClick={handleCapturePhoto}
              className={`flex-1 ${buttonPrimary} text-white py-4 px-6 rounded-xl font-bold shadow-lg active:scale-95 transition-transform`}
            >
              📸 拍照
            </button>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {/* 裁剪模态框 - 全屏界面 */}
      {showCropModal && state === 'cropping' && previewUrl && originalImage && (
        <div className="fixed inset-0 bg-black/95 z-50 flex flex-col">
          {/* 顶部标题栏 */}
          <div className={`${isFresh ? 'bg-emerald-600' : 'bg-purple-600'} text-white p-4 flex items-center justify-between`}>
            <h2 className="text-xl font-bold">请拖拽选择要识别的区域</h2>
            <button
              onClick={handleCloseCropModal}
              className="w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full transition-colors"
            >
              ✕
            </button>
          </div>

          {/* 裁剪区域 - 占据大部分空间 */}
          <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
            <div 
              ref={imageContainerRef}
              className="relative rounded-xl overflow-hidden border-4 border-white shadow-2xl bg-gray-900"
              onMouseDown={handlePointerDown}
              onMouseMove={handlePointerMove}
              onMouseUp={handlePointerUp}
              onMouseLeave={handlePointerUp}
              onTouchStart={(e) => {
                if (e.touches.length >= 2) {
                  handlePinchStart(e);
                } else {
                  handlePointerDown(e);
                }
              }}
              onTouchMove={(e) => {
                if (e.touches.length >= 2) {
                  handlePinchMove(e);
                } else {
                  handlePointerMove(e);
                }
              }}
              onTouchEnd={(e) => {
                handlePinchEnd();
                handlePointerUp(e);
              }}
              style={{ 
                cursor: isDragging ? 'grabbing' : 'grab',
                maxWidth: '100%',
                maxHeight: '90vh',
                touchAction: 'none' // 防止触摸时的默认行为（滚动、缩放等）
              }}
            >
              {!cropArea && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                  <div className="text-white text-lg">正在加载图片...</div>
                </div>
              )}
              
              <img 
                ref={imageRef}
                src={previewUrl} 
                alt="Preview" 
                className="block max-w-[95%] max-h-[85vh]"
                draggable={false}
                style={{ 
                  maxWidth: '100%',
                  height: 'auto',
                  display: 'block',
                  transform: 'scale(0.97)',
                  transformOrigin: 'center'
                }}
                onLoad={(e) => {
                  // 图片在DOM中加载完成后，如果还没有裁剪区域，再次尝试初始化
                  if (!cropArea && imageContainerRef.current && originalImage) {
                    const containerWidth = imageContainerRef.current.clientWidth || 
                                          imageContainerRef.current.offsetWidth ||
                                          imageContainerRef.current.getBoundingClientRect().width;
                    if (containerWidth > 0) {
                      initializeCropArea(originalImage, containerWidth);
                    } else {
                      // 如果容器宽度还是0，使用图片的自然宽度作为后备
                      const imgElement = e.currentTarget;
                      const maxWidth = Math.min(imgElement.naturalWidth, window.innerWidth - 80);
                      initializeCropArea(originalImage, maxWidth);
                    }
                  }
                }}
              />
              
              {/* 裁剪区域遮罩 */}
              {cropArea && (
                <>
                  {/* 外部遮罩层 */}
                  <div 
                    className="absolute inset-0 bg-black/60 pointer-events-none"
                    style={{
                      clipPath: `polygon(
                        0% 0%, 
                        0% 100%, 
                        ${cropArea.x}px 100%, 
                        ${cropArea.x}px ${cropArea.y}px, 
                        ${cropArea.x + cropArea.width}px ${cropArea.y}px, 
                        ${cropArea.x + cropArea.width}px ${cropArea.y + cropArea.height}px, 
                        ${cropArea.x}px ${cropArea.y + cropArea.height}px, 
                        ${cropArea.x}px 100%, 
                        100% 100%, 
                        100% 0%
                      )`
                    }}
                  />
                  
                  {/* 裁剪框 */}
                  <div 
                    className="absolute border-4 border-blue-400 bg-blue-500/20"
                    style={{
                      left: `${cropArea.x}px`,
                      top: `${cropArea.y}px`,
                      width: `${cropArea.width}px`,
                      height: `${cropArea.height}px`,
                      cursor: isDragging ? 'grabbing' : 'grab',
                      borderRadius: '12px'
                    }}
                  >
                    {/* 调整大小的控制点 - 更大更容易操作 */}
                    <div 
                      className="absolute -top-2 -left-2 w-6 h-6 bg-blue-400 border-2 border-white rounded-full cursor-nw-resize shadow-lg hover:bg-blue-300 transition-colors z-10 touch-none"
                      onMouseDown={(e) => handleResize(e, 'nw')}
                      onTouchStart={(e) => handleResize(e, 'nw')}
                      style={{ touchAction: 'none' }}
                    />
                    <div 
                      className="absolute -top-2 -right-2 w-6 h-6 bg-blue-400 border-2 border-white rounded-full cursor-ne-resize shadow-lg hover:bg-blue-300 transition-colors z-10 touch-none"
                      onMouseDown={(e) => handleResize(e, 'ne')}
                      onTouchStart={(e) => handleResize(e, 'ne')}
                      style={{ touchAction: 'none' }}
                    />
                    <div 
                      className="absolute -bottom-2 -left-2 w-6 h-6 bg-blue-400 border-2 border-white rounded-full cursor-sw-resize shadow-lg hover:bg-blue-300 transition-colors z-10 touch-none"
                      onMouseDown={(e) => handleResize(e, 'sw')}
                      onTouchStart={(e) => handleResize(e, 'sw')}
                      style={{ touchAction: 'none' }}
                    />
                    <div 
                      className="absolute -bottom-2 -right-2 w-6 h-6 bg-blue-400 border-2 border-white rounded-full cursor-se-resize shadow-lg hover:bg-blue-300 transition-colors z-10 touch-none"
                      onMouseDown={(e) => handleResize(e, 'se')}
                      onTouchStart={(e) => handleResize(e, 'se')}
                      style={{ touchAction: 'none' }}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 底部操作栏 */}
          <div className={`${isFresh ? 'bg-emerald-600' : 'bg-purple-600'} p-6`}>
            <div className="max-w-4xl mx-auto flex gap-4">
              <button
                onClick={handleCloseCropModal}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-4 px-6 rounded-xl font-bold shadow-lg active:scale-95 transition-all"
              >
                ✕ 取消
              </button>
              <button
                onClick={handleCropAndRecognize}
                disabled={!cropArea}
                className={`flex-1 ${buttonPrimary} ${!cropArea ? 'opacity-50 cursor-not-allowed' : ''} text-white py-4 px-6 rounded-xl font-bold shadow-lg active:scale-95 transition-all`}
              >
                ✓ 确认并识别
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ImageUploader;
