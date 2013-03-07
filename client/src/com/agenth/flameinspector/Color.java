package com.agenth.flameinspector;

public class Color {

	//Color components
	private double m_r, m_g, m_b;
	
	public static final Color 
			BLACK = new Color(0,0,0),
			WHITE = new Color(1,1,1),
			RED = new Color(1,0,0),
			GREEN = new Color(0,1,0),
			BLUE = new Color(0,0,1);
	
	public Color(double r, double g, double b){
		if(r < 0 || r > 1 || g < 0 || g > 1 || b < 0 || b > 1){
			throw new IllegalArgumentException("Color components must be doubles within range [0 1]");
		}
		
		m_r = r;
		m_g = g;
		m_b = b;
	}
	
	public double red(){
		return m_r;
	}
	
	public double green(){
		return m_g;
	}
	
	public double blue(){
		return m_b;
	}
	
	/**
	 * Sets this color as the mix of c1 and c2 with proportion p
	 * and returns this.
	 */
	public Color setMix(Color c1, Color c2, double p){
		double p2 = 1-p;
		
		m_r = p*c1.m_r + p2*c2.m_r;
		m_g = p*c1.m_g + p2*c2.m_g;
		m_b = p*c1.m_b + p2*c2.m_b;
		
		return this;
	}
	
	/**
	 * Sets this color as the same color as c
	 * @param c color to copy
	 * @return
	 */
	public Color set(Color c){
		m_r = c.m_r;
		m_g = c.m_g;
		m_b = c.m_b;
		
		return this;
	}
	
	public Color mixWith(Color that, double proportion){
		if(proportion < 0 || proportion > 1){
			throw new IllegalArgumentException("Proportion must be within range [0 1]");
		}
		double p2 = 1-proportion;
		
		return new Color(
				proportion*m_r + p2*that.m_r,
				proportion*m_g + p2*that.m_g,
				proportion*m_b + p2*that.m_b);
	}
	
	/**
	 * Returns RGB color as an 8 bit per component int, prefixed with 0s as following :
	 * 
	 * color = 0x00RRGGBB
	 */
	public int asPackedRGB(){
		return 0x00FFFFFF & (sRGBEncode(m_r, 0xFF) << 16 | sRGBEncode(m_g, 0xFF) << 8 | sRGBEncode(m_b, 0xFF));
	}
	
	static public int sRGBEncode(double v, int max){
		return (int) (max * (
				(v <= 0.0031308) ? 
					12.92*v : 
					1.055*Math.pow(v, 1/2.4) - 0.055));
	}
}
