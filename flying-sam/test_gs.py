import requests

url = "http://localhost:8000/predict"
files = {
    'file': open('cat.jpg', 'rb')
}
data = {
    'text_prompt': 'cat'
}
response = requests.post(url, files=files, data=data)