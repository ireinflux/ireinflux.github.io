
src='/workspace/lunar-lander/src/'
head=open(src+'head.html').read()
js=''.join(open(src+f).read() for f in ['a_world.js','a2_clips.js','b_lm.js','c0_radio.js','c_sim.js','c1_panel.js','c2_abort.js','c3_fail.js','d_view.js','e_panel.js','f_touch.js'])
open('/workspace/lunar-lander/index.html','w').write(head+open(src+'screens.html').read()+'\n<script type="module">\n'+js+'\n</script>\n</body>\n</html>\n')
