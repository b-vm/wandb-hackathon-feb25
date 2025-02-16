# app.py
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import numpy as np
import cv2
import base64
from typing import List
import io
from PIL import Image
from zenml.client import Client
from pydantic import BaseModel

# Import the pipeline
from pipeline import grounded_sam_pipeline

app = FastAPI(title="Grounded SAM API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PredictionResponse(BaseModel):
    boxes: List[List[float]]
    masks: List[List[List[bool]]]
    phrases: List[str]
    visualization: str

def encode_image(image: np.ndarray) -> str:
    """Convert numpy array to base64 encoded image."""
    success, encoded_image = cv2.imencode('.png', image)
    if not success:
        raise ValueError("Could not encode image")
    return base64.b64encode(encoded_image.tobytes()).decode('utf-8')

def create_visualization(
    image: np.ndarray,
    masks: np.ndarray,
    boxes: np.ndarray,
    phrases: List[str]
) -> np.ndarray:
    """Create a visualization of the predictions."""
    viz = image.copy()
    
    # Generate random colors for each mask
    colors = np.random.randint(0, 255, (len(masks), 3))
    
    # Draw masks
    for idx, (mask, box, phrase) in enumerate(zip(masks, boxes, phrases)):
        color = colors[idx].tolist()
        
        # Apply mask overlay
        mask_image = np.zeros_like(viz)
        mask_image[mask[0]] = color
        viz = cv2.addWeighted(viz, 1.0, mask_image, 0.5, 0)
        
        # Draw bounding box
        box = box.astype(int)
        cv2.rectangle(viz, (box[0], box[1]), (box[2], box[3]), color, 2)
        
        # Add text
        cv2.putText(viz, phrase, (box[0], box[1] - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
    
    return viz

@app.post("/predict", response_model=PredictionResponse)
async def predict(
    file: UploadFile = File(...),
    text_prompt: str = Form(...),
    box_threshold: float = Form(0.35),
    text_threshold: float = Form(0.25)
):
    """Endpoint to run Grounded SAM prediction."""
    try:
        # Read and process the uploaded image
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Save temporary image for ZenML pipeline
        temp_image_path = "temp_image.jpg"
        cv2.imwrite(temp_image_path, cv2.cvtColor(image, cv2.COLOR_RGB2BGR))
        
        # Run the ZenML pipeline
        output = grounded_sam_pipeline(
            image_path=temp_image_path,
            text_prompt=text_prompt,
            grounding_dino_path="models/groundingdino_swint_ogc.pth",
            sam_checkpoint="models/sam_vit_h_4b8939.pth",
            sam_type="vit_h"
        )
        
        # Create visualization
        viz = create_visualization(
            output.image,
            output.masks,
            output.boxes,
            output.phrases
        )
        
        # Prepare response
        response = {
            "boxes": output.boxes.tolist(),
            "masks": output.masks.tolist(),
            "phrases": output.phrases,
            "visualization": encode_image(viz)
        }
        
        return JSONResponse(content=response)
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"An error occurred: {str(e)}"}
        )

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)