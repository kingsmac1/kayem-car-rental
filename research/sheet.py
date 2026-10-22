import sys
from PIL import Image
out, cols, files = sys.argv[1], int(sys.argv[2]), sys.argv[3:]
ims = [Image.open(f).convert('RGB') for f in files]
w = 480; ims = [i.resize((w, int(i.height*w/i.width))) for i in ims]
h = max(i.height for i in ims); rows = (len(ims)+cols-1)//cols
s = Image.new('RGB', (cols*w, rows*h), 'white')
for k, i in enumerate(ims): s.paste(i, ((k%cols)*w, (k//cols)*h))
s.save(out)
