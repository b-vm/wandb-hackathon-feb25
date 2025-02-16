from zenml import pipeline, step
from zenml.config import DockerSettings
from zenml.integrations.constants import PYTORCH
from typing import Tuple, List
import torch
from mobile_sam import sam_model_registry, SamAutomaticMaskGenerator, SamPredictor
import numpy as np
import cv2
from dataclasses import dataclass

@dataclass
class PipelineOutput:
    image: np.ndarray
    masks: List[dict]
    segmented_image: np.ndarray

def get_device() -> torch.device:
    """Get the appropriate device (CPU or CUDA) based on availability."""
    # if torch.cuda.is_available():
    #     try:
    #         torch.zeros(1).cuda()
    #         return torch.device('cuda')
    #     except RuntimeError:
    #         return torch.device('cpu')
    return torch.device('cpu')

@step(enable_cache=False)
def load_sam2_model(
    checkpoint_path: str = "models/sam_vit_h_4b8939.pth",
    model_type: str = "vit_h"
) -> SamAutomaticMaskGenerator:
    """Load SAM-2 model and create automatic mask generator."""
    device = get_device()
    print(f"Using device: {device}")
    
    # Initialize SAM-2
    sam = sam_model_registry[model_type](checkpoint=checkpoint_path)
    sam.to(device=device)
    
    # Create automatic mask generator with optimized parameters
    mask_generator = SamAutomaticMaskGenerator(
        model=sam,
        points_per_side=32,  # Increase for more dense sampling
        pred_iou_thresh=0.86,  # Increase for higher quality masks
        stability_score_thresh=0.92,  # Increase for more stable masks
        crop_n_layers=1,
        crop_n_points_downscale_factor=2,
        min_mask_region_area=100,  # Minimum size of segmented regions
    )
    
    return mask_generator

@step
def process_image(
    image_path: str,
) -> np.ndarray:
    """Load and preprocess image."""
    image = cv2.imread(image_path)
    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    return image

@step
def generate_masks(
    mask_generator: SamAutomaticMaskGenerator,
    image: np.ndarray,
) -> List[dict]:
    """Generate automatic segmentation masks using SAM-2."""
    masks = mask_generator.generate(image)
    
    # Sort masks by area (largest first)
    masks = sorted(masks, key=lambda x: x['area'], reverse=True)
    return masks

@step
def create_visualization(
    image: np.ndarray,
    masks: List[dict],
    alpha: float = 0.4
) -> np.ndarray:
    """Create visualization of the segmented image."""
    # Start with the original image
    viz = image.copy()
    
    # Generate random colors for each mask
    colors = np.random.randint(0, 255, (len(masks), 3))
    
    # Apply masks with different colors
    for idx, mask_data in enumerate(masks):
        mask = mask_data['segmentation']
        color = colors[idx]
        
        # Create colored mask
        mask_image = np.zeros_like(viz)
        mask_image[mask] = color
        
        # Blend with original image
        viz = cv2.addWeighted(viz, 1.0, mask_image, alpha, 0)
        
        # Draw mask boundary
        contours, _ = cv2.findContours(
            mask.astype(np.uint8),
            cv2.RETR_EXTERNAL,
            cv2.CHAIN_APPROX_SIMPLE
        )
        cv2.drawContours(viz, contours, -1, color.tolist(), 2)
        
        # Add mask index
        M = cv2.moments(mask.astype(np.uint8))
        if M["m00"] != 0:
            cx = int(M["m10"] / M["m00"])
            cy = int(M["m01"] / M["m00"])
            cv2.putText(viz, f"{idx+1}", (cx, cy),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.8, color.tolist(), 2)
    
    return viz

@pipeline
def sam2_auto_pipeline(
    image_path: str,
    checkpoint_path: str,
    model_type: str = "vit_h"
) -> PipelineOutput:
    """Main pipeline for SAM-2 automatic segmentation."""
    # Load SAM-2 model
    mask_generator = load_sam2_model(
        checkpoint_path=checkpoint_path,
        model_type=model_type
    )
    
    # Process image
    image = process_image(image_path=image_path)
    
    # Generate masks
    masks = generate_masks(
        mask_generator=mask_generator,
        image=image
    )
    
    # Create visualization
    segmented_image = create_visualization(
        image=image,
        masks=masks
    )
    
    return PipelineOutput(
        image=image,
        masks=masks,
        segmented_image=segmented_image
    )

# Example usage
if __name__ == "__main__":
    pipeline_instance = sam2_auto_pipeline(
        image_path="esp32.jpg",
        checkpoint_path="models/sam_vit_h_4b8939.pth",
        model_type="vit_h"
    )