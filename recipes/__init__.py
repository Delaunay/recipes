__descr__ = ' '
__version__ = 'version'
__license__ = 'BSD 3-Clause License'
__author__ = u'Pierre Delaunay'
__author_short__ = u'Pierre'
__author_email__ = 'pierre@delaunay.io'
__copyright__ = u'2021 Pierre Delaunay'
__url__ = 'http://github.com/Delaunay/recipes'




def my_function(a: int, b: int) -> int:
    """Add two numbers together

    Parameters
    ----------
    a: int
        first integer

    b: int
        second integer

    Raises
    ------
    value errror if a == 0 

    Examples
    --------

    >>> my_function(1, 2)
    3
    >>> my_function(0, 2)
    Traceback (most recent call last):
      ...
    ValueError

    """
    if a == 0:
        raise ValueError()

    return a + b