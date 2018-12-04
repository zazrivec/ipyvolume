"""
Scatter
=======

A simple scatter plot

Using the pylab API
-------------------
"""

import ipyvolume as ipv
import numpy as np
x, y, z = np.random.random((3, 10000))
ipv.quickscatter(x, y, z, size=1, marker="sphere")

N = 1000
x, y, z = np.random.normal(0, 1, (3, N))

fig = ipv.figure()
s = ipv.scatter(x, y, x)
ipv.show()


################################################
# Using the object model
# ----------------------
# A similar result can be obtained using the object model.


fig