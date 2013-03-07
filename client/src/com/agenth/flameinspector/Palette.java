package com.agenth.flameinspector;

import com.agenth.flameinspector.Color;

public interface Palette {

	Color colorForIndex(double index);
	void setColorForIndex(Color c, double index);

}

